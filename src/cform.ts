import { Instruction, Op, Operand, Program } from "./ir";

const MAX_LENGTH = 120;

interface Rendered {
  text: string;
  prec: number;
}

const PRIMARY_PREC = 8;
const UNARY_PREC = 7;

const BINARY_OPS: Partial<Record<Op, { symbol: string; prec: number }>> = {
  or: { symbol: "|", prec: 1 },
  xor: { symbol: "^", prec: 2 },
  and: { symbol: "&", prec: 3 },
  shl: { symbol: "<<", prec: 4 },
  lshr: { symbol: ">>", prec: 4 },
  add: { symbol: "+", prec: 5 },
  sub: { symbol: "-", prec: 5 },
  mul: { symbol: "*", prec: 6 },
};

function formatVar(index: number): string {
  return index === 0 ? "x" : "y";
}

function formatConst(value: number): string {
  if (value < 10) return String(value);
  return `0x${value.toString(16).toUpperCase()}`;
}

function paren(node: Rendered): string {
  return `(${node.text})`;
}

function renderOperand(operand: Operand, program: Program): Rendered {
  if (operand.kind === "input") return { text: formatVar(operand.index), prec: PRIMARY_PREC };
  if (operand.kind === "const") return { text: formatConst(operand.value), prec: PRIMARY_PREC };
  return renderInstruction(program.instructions[operand.index], program);
}

function renderInstruction(instruction: Instruction, program: Program): Rendered {
  const { op, operands } = instruction;

  if (op === "not" || op === "neg") {
    const symbol = op === "not" ? "~" : "-";
    const arg = renderOperand(operands[0], program);
    const argText = arg.prec < UNARY_PREC ? paren(arg) : arg.text;
    return { text: `${symbol}${argText}`, prec: UNARY_PREC };
  }

  if (op === "ashr") {
    const left = renderOperand(operands[0], program);
    const right = renderOperand(operands[1], program);
    return { text: `ashr(${left.text}, ${right.text})`, prec: PRIMARY_PREC };
  }

  const info = BINARY_OPS[op]!;
  const left = renderOperand(operands[0], program);
  const right = renderOperand(operands[1], program);
  const leftText = left.prec < info.prec ? paren(left) : left.text;
  const rightText = right.prec <= info.prec ? paren(right) : right.text;
  return { text: `${leftText} ${info.symbol} ${rightText}`, prec: info.prec };
}

export function toExpression(program: Program): string | null {
  const rendered = renderOperand(program.output, program);
  return rendered.text.length > MAX_LENGTH ? null : rendered.text;
}
