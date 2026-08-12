import type { BitVec, Context } from "z3-solver";
import { Op, Operand, Program, countInputs } from "./ir";

function assertNever(x: never): never {
  throw new Error(`unhandled op: ${String(x)}`);
}

export function applyZ3(
  ctx: Context<"main">,
  op: Op,
  args: BitVec<number, "main">[],
): BitVec<number, "main"> {
  switch (op) {
    case "add": return args[0].add(args[1]);
    case "sub": return args[0].sub(args[1]);
    case "mul": return args[0].mul(args[1]);
    case "and": return args[0].and(args[1]);
    case "or": return args[0].or(args[1]);
    case "xor": return args[0].xor(args[1]);
    case "not": return args[0].not();
    case "neg": return args[0].neg();
    case "shl": return args[0].shl(args[1]);
    case "lshr": return args[0].lshr(args[1]);
    case "ashr": return args[0].shr(args[1]);
    default: return assertNever(op);
  }
}

export function encode(
  ctx: Context<"main">,
  program: Program,
  nInputs?: number,
): { inputs: BitVec<number, "main">[]; output: BitVec<number, "main"> } {
  const width = program.width;
  const count = nInputs ?? countInputs(program);
  const inputs = Array.from({ length: count }, (_, i) => ctx.BitVec.const(`in${i}`, width));
  const results: BitVec<number, "main">[] = [];
  const resolve = (operand: Operand): BitVec<number, "main"> => {
    if (operand.kind === "input") return inputs[operand.index];
    if (operand.kind === "const") return ctx.BitVec.val(operand.value, width);
    return results[operand.index];
  };
  for (const instruction of program.instructions) {
    results.push(applyZ3(ctx, instruction.op, instruction.operands.map(resolve)));
  }
  return { inputs, output: resolve(program.output) };
}
