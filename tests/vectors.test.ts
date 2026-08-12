import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = ["interp_vectors.json", "equiv_vectors.json", "synthesis_vectors.json"];

describe("vector files", () => {
  it("carry the saturate shift-mode marker", () => {
    for (const file of files) {
      const data = JSON.parse(readFileSync(`vectors/${file}`, "utf8"));
      expect(data.shift_mode, file).toBe("saturate");
    }
  });
});
