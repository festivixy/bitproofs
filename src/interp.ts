import { Op, Operand, Program } from "./ir";

function applyOp(op: Op, args: bigint[], width: bigint, mask: bigint): bigint {
  switch (op) {
    case "add": return (args[0] + args[1]) & mask;
    case "sub": return (args[0] - args[1]) & mask;
    case "mul": return (args[0] * args[1]) & mask;
    case "and": return args[0] & args[1];
    case "or": return args[0] | args[1];
    case "xor": return args[0] ^ args[1];
    case "not": return ~args[0] & mask;
    case "neg": return -args[0] & mask;
    case "shl": return args[1] >= width ? 0n : (args[0] << args[1]) & mask;
    case "lshr": return args[1] >= width ? 0n : args[0] >> args[1];
    case "ashr": {
      const sign = args[0] >> (width - 1n);
      if (args[1] >= width) return sign === 1n ? mask : 0n;
      const signed = sign === 1n ? args[0] - (mask + 1n) : args[0];
      return (signed >> args[1]) & mask;
    }
  }
}

export function execute(program: Program, inputs: number[]): number {
  const width = BigInt(program.width);
  const mask = (1n << width) - 1n;
  const results: bigint[] = [];
  const resolve = (operand: Operand): bigint => {
    if (operand.kind === "input") return BigInt(inputs[operand.index]) & mask;
    if (operand.kind === "const") return BigInt(operand.value) & mask;
    return results[operand.index];
  };
  for (const instruction of program.instructions) {
    const args = instruction.operands.map(resolve);
    results.push(applyOp(instruction.op, args, width, mask));
  }
  return Number(resolve(program.output));
}
