import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog";
import { parseProgram, Program } from "../src/ir";
import { execute } from "../src/interp";
import { renderEntry } from "../src/pages";
import { installFakeDocument } from "./dom-shim";

const EXPECTED_SLUGS = [
  "abs_diff", "absval", "avg_ceil", "avg_floor", "bit_reverse32",
  "bswap32", "clear_lowest_bit", "clp2", "flp2", "isolate_highest_bit",
  "isolate_lowest_zero", "isolate_rmb", "parity", "popcount", "rotl5",
  "round_down_8", "round_up_8", "sign", "sign_extend_byte",
  "smear_lowest_bit", "swap_halves", "times_nine",
  "turn_off_trailing_ones", "turn_on_lowest_zero", "zero_high_half",
];

describe("loadCatalog", () => {
  it("returns 25 entries in catalog order", () => {
    const entries = loadCatalog();
    expect(entries.map((entry) => entry.slug)).toEqual(EXPECTED_SLUGS);
  });

  it("parses every non-null program and spec", () => {
    const entries = loadCatalog();
    for (const entry of entries) {
      for (const field of [entry.spec, entry.program, entry.spec_8bit, entry.program_8bit]) {
        if (field !== null) {
          expect(() => parseProgram(field)).not.toThrow();
        }
      }
    }
  });

  it("re-executes example_8bit rows through the TS interp", () => {
    const entries = loadCatalog();
    for (const entry of entries) {
      const source = entry.program_8bit ?? entry.spec_8bit;
      if (source === null) continue;
      const program: Program = parseProgram(source);
      for (const row of entry.example_8bit) {
        expect(execute(program, row.inputs), entry.slug).toBe(row.output);
      }
    }
  });
});

describe("renderEntry", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders a proven badge and a program block for absval", () => {
    const entries = loadCatalog();
    const absval = entries.find((entry) => entry.slug === "absval")!;
    const el = renderEntry(absval);
    expect(el.textContent).toContain("proven");
    expect(el.querySelector("pre.program")).not.toBeNull();
  });
});
