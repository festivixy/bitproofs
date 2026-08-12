import { Op, Operand, Program, countInputs } from "./ir";

export function applyZ3(ctx: any, op: Op, args: any[]): any {
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
  }
}

export function encode(ctx: any, program: Program, nInputs?: number): { inputs: any[]; output: any } {
  const width = program.width;
  const count = nInputs ?? countInputs(program);
  const inputs = Array.from({ length: count }, (_, i) => ctx.BitVec.const(`in${i}`, width));
  const results: any[] = [];
  const resolve = (operand: Operand): any => {
    if (operand.kind === "input") return inputs[operand.index];
    if (operand.kind === "const") return ctx.BitVec.val(operand.value, width);
    return results[operand.index];
  };
  for (const instruction of program.instructions) {
    results.push(applyZ3(ctx, instruction.op, instruction.operands.map(resolve)));
  }
  return { inputs, output: resolve(program.output) };
}
