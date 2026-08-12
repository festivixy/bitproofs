import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { parseProgram } from "../src/ir";
import { execute } from "../src/interp";
import { equivalent } from "../src/equiv";
import { parseLibrary, synthesize } from "../src/cegis";
import { getContext } from "../src/z3";

const vectors = JSON.parse(readFileSync("vectors/synthesis_vectors.json", "utf8"));

let ctx: any;
beforeAll(async () => {
  ctx = await getContext();
});

describe("cegis matches the python oracle", () => {
  for (const c of vectors.cases) {
    it(c.name, async () => {
      const spec = parseProgram(c.spec);
      const library = parseLibrary(c.library);
      const result = await synthesize(ctx, spec, library);
      if (!c.expected_found) {
        expect(result).toBeNull();
        return;
      }
      expect(result).not.toBeNull();
      expect(result!.instructions.length).toBe(c.expected_length);
      const verdict = await equivalent(ctx, result!, spec);
      expect(verdict.kind).toBe("equivalent");
      for (let x = 0; x < 256; x++) {
        expect(execute(result!, [x])).toBe(execute(spec, [x]));
      }
    });
  }
});
