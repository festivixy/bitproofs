import { describe, expect, it } from "vitest";
import { toExpression } from "../src/cform";
import { parseExpr } from "../src/expr";
import { execute } from "../src/interp";
import { Instruction, Operand, Program } from "../src/ir";

const WIDTH = 8;
const x: Operand = { kind: "input", index: 0 };
const result = (index: number): Operand => ({ kind: "result", index });

function program(instructions: Instruction[], output: Operand): Program {
  return { width: WIDTH, instructions, output };
}

function checkRoundTrip(p: Program): void {
  const expr = toExpression(p);
  expect(expr).not.toBeNull();
  const reparsed = parseExpr(expr!, WIDTH);
  for (let input = 0; input < 256; input++) {
    expect(execute(reparsed, [input])).toBe(execute(p, [input]));
  }
}

describe("toExpression round-trip", () => {
  it("round-trips x & (x - 1)", () => {
    const p = program(
      [
        { op: "sub", operands: [x, { kind: "const", value: 1 }] },
        { op: "and", operands: [x, result(0)] },
      ],
      result(1),
    );
    checkRoundTrip(p);
  });

  it("round-trips absval's ashr/xor/sub shape", () => {
    const p = program(
      [
        { op: "ashr", operands: [x, { kind: "const", value: 7 }] },
        { op: "xor", operands: [x, result(0)] },
        { op: "sub", operands: [result(1), result(0)] },
      ],
      result(2),
    );
    checkRoundTrip(p);
    expect(toExpression(p)).toBe("(x ^ ashr(x, 7)) - ashr(x, 7)");
  });

  it("round-trips a unary chain: ~-x", () => {
    const p = program(
      [
        { op: "neg", operands: [x] },
        { op: "not", operands: [result(0)] },
      ],
      result(1),
    );
    checkRoundTrip(p);
    expect(toExpression(p)).toBe("~-x");
  });

  it("round-trips not applied to a binary expression: ~(x & 1)", () => {
    const p = program(
      [
        { op: "and", operands: [x, { kind: "const", value: 1 }] },
        { op: "not", operands: [result(0)] },
      ],
      result(1),
    );
    checkRoundTrip(p);
    expect(toExpression(p)).toBe("~(x & 1)");
  });

  it("renders a zero-instruction program as its output operand", () => {
    const p = program([], x);
    expect(toExpression(p)).toBe("x");
  });
});

describe("toExpression precedence", () => {
  it("parenthesizes and inside add, since and binds looser than add", () => {
    const p = program(
      [
        { op: "and", operands: [x, { kind: "const", value: 1 }] },
        { op: "add", operands: [x, result(0)] },
      ],
      result(1),
    );
    expect(toExpression(p)).toBe("x + (x & 1)");
    checkRoundTrip(p);
  });

  it("parenthesizes a right-hand sub, since sub is left-associative", () => {
    const p = program(
      [
        { op: "sub", operands: [x, { kind: "const", value: 1 }] },
        { op: "sub", operands: [x, result(0)] },
      ],
      result(1),
    );
    expect(toExpression(p)).toBe("x - (x - 1)");
    checkRoundTrip(p);
  });

  it("does not parenthesize a left-hand sub, since sub is left-associative", () => {
    const p = program(
      [
        { op: "sub", operands: [x, { kind: "const", value: 1 }] },
        { op: "sub", operands: [result(0), x] },
      ],
      result(1),
    );
    expect(toExpression(p)).toBe("x - 1 - x");
    checkRoundTrip(p);
  });
});

describe("toExpression length cap", () => {
  it("returns null once duplicated inlining exceeds 120 characters", () => {
    const instructions: Instruction[] = [{ op: "xor", operands: [x, { kind: "const", value: 1 }] }];
    let cur: Operand = result(0);
    for (let i = 0; i < 6; i++) {
      instructions.push({ op: "and", operands: [cur, cur] });
      cur = result(instructions.length - 1);
    }
    const p = program(instructions, cur);
    expect(toExpression(p)).toBeNull();
  });
});
