import { describe, expect, it } from "vitest";
import { parseExpr } from "../src/expr";
import { execute } from "../src/interp";

describe("parseExpr", () => {
  it("parses x & (x - 1) into 2 instructions and executes correctly", () => {
    const program = parseExpr("x & (x - 1)", 8);
    expect(program.instructions.length).toBe(2);
    expect(program.instructions.map((i) => i.op)).toEqual(["sub", "and"]);
    for (let x = 0; x < 256; x++) {
      expect(execute(program, [x])).toBe(x & ((x - 1) & 0xff));
    }
  });

  it("groups x & x + 1 << 2 as x & ((x + 1) << 2)", () => {
    const a = parseExpr("x & x + 1 << 2", 8);
    const b = parseExpr("x & ((x + 1) << 2)", 8);
    for (let x = 0; x < 256; x++) {
      expect(execute(a, [x])).toBe(execute(b, [x]));
    }
  });

  it("parses hex literals and executes as xor", () => {
    const program = parseExpr("x ^ 0xFF", 8);
    for (let x = 0; x < 256; x++) {
      expect(execute(program, [x])).toBe(x ^ 0xff);
    }
  });

  it("matches ~x + 1 to -x & 0xFF for all 8-bit inputs", () => {
    const a = parseExpr("~x + 1", 8);
    const b = parseExpr("-x & 0xFF", 8);
    for (let x = 0; x < 256; x++) {
      expect(execute(a, [x])).toBe(execute(b, [x]));
    }
  });

  it("parses ashr(x, 7) as arithmetic shift right", () => {
    const program = parseExpr("ashr(x, 7)", 8);
    expect(execute(program, [0x80])).toBe(0xff);
  });

  it("parses >> as logical shift right", () => {
    const program = parseExpr("x >> 1", 8);
    expect(execute(program, [0x80])).toBe(0x40);
  });

  it("parses a bare variable to a zero-instruction program", () => {
    const program = parseExpr("x", 8);
    expect(program.instructions.length).toBe(0);
    expect(program.output).toEqual({ kind: "input", index: 0 });
  });

  it("parses a bare literal to a zero-instruction program", () => {
    const program = parseExpr("42", 8);
    expect(program.instructions.length).toBe(0);
    expect(program.output).toEqual({ kind: "const", value: 42 });
  });

  it("masks literals to width", () => {
    const program = parseExpr("256", 8);
    expect(program.output).toEqual({ kind: "const", value: 0 });
  });

  it.each([
    ["y", "y"],
    ["x /", "/"],
    ["x >>", "unexpected end"],
    ["((x)", "unexpected end"],
    ["", "unexpected end"],
  ])("rejects %j naming the offending token", (source, needle) => {
    expect(() => parseExpr(source, 8)).toThrow(needle);
  });
});
