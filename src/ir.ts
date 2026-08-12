export type Op =
  | "add" | "sub" | "mul" | "and" | "or" | "xor"
  | "not" | "neg" | "shl" | "lshr" | "ashr";

export const OPS: Op[] = [
  "add", "sub", "mul", "and", "or", "xor", "not", "neg", "shl", "lshr", "ashr",
];

export const ARITY: Record<Op, number> = {
  add: 2, sub: 2, mul: 2, and: 2, or: 2, xor: 2,
  not: 1, neg: 1, shl: 2, lshr: 2, ashr: 2,
};

export type Operand =
  | { kind: "input"; index: number }
  | { kind: "const"; value: number }
  | { kind: "result"; index: number };

export interface Instruction {
  op: Op;
  operands: Operand[];
}

export interface Program {
  width: number;
  instructions: Instruction[];
  output: Operand;
}

function parseOperand(data: any): Operand {
  if (data.kind === "input" && Number.isInteger(data.index)) {
    return { kind: "input", index: data.index };
  }
  if (data.kind === "const" && Number.isInteger(data.value)) {
    return { kind: "const", value: data.value };
  }
  if (data.kind === "result" && Number.isInteger(data.index)) {
    return { kind: "result", index: data.index };
  }
  throw new Error(`bad operand: ${JSON.stringify(data)}`);
}

export function parseProgram(data: any): Program {
  if (!Number.isInteger(data.width) || !Array.isArray(data.instructions)) {
    throw new Error("bad program");
  }
  return {
    width: data.width,
    instructions: data.instructions.map((ins: any) => {
      if (!OPS.includes(ins.op)) throw new Error(`bad op: ${ins.op}`);
      const operands = ins.operands.map(parseOperand);
      if (operands.length !== ARITY[ins.op as Op]) throw new Error(`bad arity for ${ins.op}`);
      return { op: ins.op as Op, operands };
    }),
    output: parseOperand(data.output),
  };
}

export function countInputs(program: Program): number {
  let count = 0;
  const visit = (o: Operand) => {
    if (o.kind === "input") count = Math.max(count, o.index + 1);
  };
  for (const ins of program.instructions) ins.operands.forEach(visit);
  visit(program.output);
  return count;
}
