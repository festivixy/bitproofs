import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { parseProgram } from "../src/ir";
import { execute } from "../src/interp";
import { equivalent } from "../src/equiv";
import { getContext } from "../src/z3";

const vectors = JSON.parse(readFileSync("vectors/equiv_vectors.json", "utf8"));

let ctx: any;
beforeAll(async () => {
  ctx = await getContext();
});

describe("equiv matches the python oracle", () => {
  it("agrees on every verdict and produces real counterexamples", async () => {
    for (const c of vectors.cases) {
      const a = parseProgram(c.a);
      const b = parseProgram(c.b);
      const result = await equivalent(ctx, a, b);
      expect(result.kind === "equivalent" ? "equivalent" : "counterexample").toBe(c.verdict);
      if (result.kind === "counterexample") {
        expect(execute(a, result.inputs)).not.toBe(execute(b, result.inputs));
      }
    }
  });
});
