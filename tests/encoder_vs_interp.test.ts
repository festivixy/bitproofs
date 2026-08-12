import { beforeAll, describe, expect, it } from "vitest";
import { ARITY, OPS, Operand, Program } from "../src/ir";
import { execute } from "../src/interp";
import { encode } from "../src/encode";
import { getContext } from "../src/z3";

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomProgram(next: () => number, width: number, nInputs: number, nIns: number): Program {
  const instructions = [];
  for (let i = 0; i < nIns; i++) {
    const op = OPS[Math.floor(next() * OPS.length)];
    const operands: Operand[] = [];
    for (let j = 0; j < ARITY[op]; j++) {
      const pool = nInputs + i;
      const choice = Math.floor(next() * (pool + 2));
      if (choice < nInputs) operands.push({ kind: "input", index: choice });
      else if (choice < pool) operands.push({ kind: "result", index: choice - nInputs });
      else operands.push({ kind: "const", value: Math.floor(next() * 2 ** width) });
    }
    instructions.push({ op, operands });
  }
  return { width, instructions, output: { kind: "result", index: nIns - 1 } };
}

let ctx: any;
beforeAll(async () => {
  ctx = await getContext();
});

describe("encoder matches interpreter", () => {
  it("agrees on random programs and concrete inputs", async () => {
    const next = rng(7);
    for (let i = 0; i < 150; i++) {
      const width = next() < 0.5 ? 8 : 32;
      const nInputs = 1 + Math.floor(next() * 2);
      const program = randomProgram(next, width, nInputs, 1 + Math.floor(next() * 4));
      const { inputs, output } = encode(ctx, program, nInputs);
      for (let k = 0; k < 3; k++) {
        const concrete = Array.from({ length: nInputs }, () => Math.floor(next() * 2 ** width));
        const expected = execute(program, concrete);
        const solver = new ctx.Solver();
        inputs.forEach((v: any, s: number) => solver.add(v.eq(ctx.BitVec.val(concrete[s], width))));
        solver.add(output.neq(ctx.BitVec.val(expected, width)));
        expect(await solver.check(), JSON.stringify(program)).toBe("unsat");
      }
    }
  });
});
