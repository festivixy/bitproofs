import type { BitVec, BitVecNum, Context } from "z3-solver";
import { ARITY, Instruction, OPS, Op, Operand, Program, countInputs } from "./ir";
import { applyZ3 } from "./encode";
import { equivalent } from "./equiv";
import { execute } from "./interp";

export interface Library {
  ops: Op[];
  nConstants: number;
  fixedConstants: number[];
}

export function parseLibrary(data: any): Library {
  const ops = (data.ops ?? []).map((op: any) => {
    if (!OPS.includes(op)) throw new Error(`bad op: ${op}`);
    return op as Op;
  });
  const nConstants = data.n_constants ?? 0;
  const fixedConstants = data.fixed_constants ?? [];
  if (!Number.isInteger(nConstants) || !Array.isArray(fixedConstants)) {
    throw new Error("bad library");
  }
  return { ops, nConstants, fixedConstants };
}

const COMMUTATIVE = new Set<Op>(["add", "mul", "and", "or", "xor"]);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Assignment {
  lo: number[];
  li: Map<string, number>;
  consts: number[];
}

function decode(assignment: Assignment, library: Library, nInputs: number, width: number): Program {
  const ops = library.ops;
  const nConsts = library.nConstants + library.fixedConstants.length;
  const nLines = nInputs + nConsts + ops.length;
  const order = ops.map((_, k) => k).sort((a, b) => assignment.lo[a] - assignment.lo[b]);
  const lineToResult = new Map<number, number>();
  order.forEach((k, pos) => lineToResult.set(assignment.lo[k], pos));
  const operand = (line: number): Operand => {
    if (line < nInputs) return { kind: "input", index: line };
    if (line < nInputs + nConsts) return { kind: "const", value: assignment.consts[line - nInputs] };
    return { kind: "result", index: lineToResult.get(line)! };
  };
  const instructions: Instruction[] = order.map((k) => ({
    op: ops[k],
    operands: Array.from({ length: ARITY[ops[k]] }, (_, j) => operand(assignment.li.get(`${k}_${j}`)!)),
  }));
  return { width, instructions, output: { kind: "result", index: lineToResult.get(nLines - 1)! } };
}

function bitLength(n: number): number {
  let bits = 0;
  while (n > 0) {
    bits += 1;
    n >>= 1;
  }
  return bits;
}

async function finiteSynthesis(
  ctx: Context<"main">,
  spec: Program,
  library: Library,
  examples: number[][],
  nInputs: number,
  width: number,
): Promise<Assignment | null> {
  const ops = library.ops;
  const nFree = library.nConstants;
  const fixed = library.fixedConstants;
  const nConsts = nFree + fixed.length;
  const nLines = nInputs + nConsts + ops.length;
  const locWidth = Math.max(1, bitLength(nLines));
  const lo: BitVec<number, "main">[] = ops.map((_, k) => ctx.BitVec.const(`lo_${k}`, locWidth));
  const li = new Map<string, BitVec<number, "main">>();
  ops.forEach((op, k) => {
    for (let j = 0; j < ARITY[op]; j++) {
      li.set(`${k}_${j}`, ctx.BitVec.const(`li_${k}_${j}`, locWidth));
    }
  });
  const freeConsts: BitVec<number, "main">[] = Array.from({ length: nFree }, (_, s) =>
    ctx.BitVec.const(`c_${s}`, width),
  );
  const consts: BitVec<number, "main">[] = [...freeConsts, ...fixed.map((v) => ctx.BitVec.val(v, width))];
  const solver = new ctx.Solver();
  const firstOpLine = nInputs + nConsts;
  for (const v of lo) {
    solver.add(v.uge(firstOpLine));
    solver.add(v.ult(nLines));
  }
  for (const v of li.values()) {
    solver.add(v.ult(nLines));
  }
  if (lo.length >= 2) solver.add(ctx.Distinct(...lo));
  for (const [key, v] of li) {
    const k = Number(key.split("_")[0]);
    solver.add(v.ult(lo[k]));
  }
  const sameOp = new Map<Op, number[]>();
  ops.forEach((op, k) => {
    const list = sameOp.get(op) ?? [];
    list.push(k);
    sameOp.set(op, list);
  });
  for (const indices of sameOp.values()) {
    for (let i = 0; i + 1 < indices.length; i++) {
      solver.add(lo[indices[i]].ult(lo[indices[i + 1]]));
    }
  }
  ops.forEach((op, k) => {
    if (COMMUTATIVE.has(op) && ARITY[op] === 2) {
      solver.add(li.get(`${k}_0`)!.ule(li.get(`${k}_1`)!));
    }
  });
  examples.forEach((inputs, e) => {
    const expected = execute(spec, inputs);
    const out: BitVec<number, "main">[] = ops.map((_, k) => ctx.BitVec.const(`o_${e}_${k}`, width));
    const iv = new Map<string, BitVec<number, "main">>();
    ops.forEach((op, k) => {
      for (let j = 0; j < ARITY[op]; j++) {
        iv.set(`${k}_${j}`, ctx.BitVec.const(`iv_${e}_${k}_${j}`, width));
      }
    });
    ops.forEach((op, k) => {
      const args = Array.from({ length: ARITY[op] }, (_, j) => iv.get(`${k}_${j}`)!);
      solver.add(out[k].eq(applyZ3(ctx, op, args)));
    });
    for (const [key, port] of iv) {
      const kj = li.get(key)!;
      for (let m = 0; m < ops.length; m++) {
        solver.add(ctx.Implies(kj.eq(lo[m]), port.eq(out[m])));
      }
      for (let s = 0; s < nInputs; s++) {
        solver.add(ctx.Implies(kj.eq(ctx.BitVec.val(s, locWidth)), port.eq(ctx.BitVec.val(inputs[s], width))));
      }
      for (let s = 0; s < nConsts; s++) {
        solver.add(ctx.Implies(kj.eq(ctx.BitVec.val(nInputs + s, locWidth)), port.eq(consts[s])));
      }
    }
    for (let m = 0; m < ops.length; m++) {
      solver.add(ctx.Implies(lo[m].eq(ctx.BitVec.val(nLines - 1, locWidth)), out[m].eq(ctx.BitVec.val(expected, width))));
    }
  });
  const verdict = await solver.check();
  if (verdict === "unknown") throw new Error("finite synthesis returned unknown");
  if (verdict !== "sat") return null;
  const model = solver.model();
  const readNum = (v: BitVec<number, "main">): number =>
    Number((model.eval(v, true) as BitVecNum<number, "main">).value());
  const constValues = freeConsts.map(readNum);
  fixed.forEach((v) => constValues.push(v));
  const liValues = new Map<string, number>();
  for (const [key, v] of li) liValues.set(key, readNum(v));
  return { lo: lo.map(readNum), li: liValues, consts: constValues };
}

export async function synthesize(
  ctx: Context<"main">,
  spec: Program,
  library: Library,
  seed = 0,
  maxIters = 64,
  onExample?: (inputs: number[]) => void,
  onCandidate?: (program: Program) => void,
): Promise<Program | null> {
  const width = spec.width;
  const nInputs = countInputs(spec);
  const bound = 2 ** width;
  const rng = mulberry32(seed);
  const examples: number[][] = [
    Array.from({ length: nInputs }, () => Math.floor(rng() * bound)),
  ];
  for (let iter = 0; iter < maxIters; iter++) {
    const assignment = await finiteSynthesis(ctx, spec, library, examples, nInputs, width);
    if (assignment === null) return null;
    const program = decode(assignment, library, nInputs, width);
    onCandidate?.(program);
    const result = await equivalent(ctx, program, spec);
    if (result.kind === "equivalent") return program;
    examples.push(result.inputs);
    onExample?.(result.inputs);
  }
  throw new Error("cegis did not converge within maxIters");
}
