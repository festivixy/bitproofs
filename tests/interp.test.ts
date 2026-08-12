import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/ir";
import { execute } from "../src/interp";

const vectors = JSON.parse(readFileSync("vectors/interp_vectors.json", "utf8"));

describe("interp matches the python oracle", () => {
  it("agrees on every vector case", () => {
    for (const c of vectors.cases) {
      const program = parseProgram(c.program);
      c.inputs.forEach((inputs: number[], i: number) => {
        expect(execute(program, inputs), JSON.stringify(c.program)).toBe(c.outputs[i]);
      });
    }
  });
});
