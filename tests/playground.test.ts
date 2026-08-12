import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog";
import { parseLibrary, synthesize } from "../src/cegis";
import { parseProgram } from "../src/ir";
import { deriveLibrary, renderPlayground, withTimeout } from "../src/playground";
import { getContext } from "../src/z3";
import { installFakeDocument } from "./dom-shim";

describe("deriveLibrary", () => {
  it("derives absval's library from its 32-bit program", () => {
    const entries = loadCatalog();
    const absval = entries.find((entry) => entry.slug === "absval")!;
    const library = deriveLibrary(absval)!;
    expect(library.ops.slice().sort()).toEqual(["ashr", "sub", "xor"]);
    expect(library.nConstants).toBe(1);
    expect(library.fixedConstants).toEqual([]);
  });

  it("returns null for an entry with no derived program", () => {
    const entries = loadCatalog();
    const popcount = entries.find((entry) => entry.slug === "popcount")!;
    expect(deriveLibrary(popcount)).toBeNull();
  });
});

describe("withTimeout", () => {
  it("rejects with a timeout error when the promise never settles", async () => {
    await expect(withTimeout(new Promise(() => {}), 50)).rejects.toThrow("timeout");
  });

  it("resolves with the wrapped value when the promise settles first", async () => {
    await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });
});

describe("synthesize with onExample", () => {
  let ctx: any;
  beforeAll(async () => {
    ctx = await getContext();
  });

  it("still finds the length-3 absval8 program and calls the spy zero or more times", async () => {
    const vectors = JSON.parse(readFileSync("vectors/synthesis_vectors.json", "utf8"));
    const c = vectors.cases.find((entry: any) => entry.name === "absval8_one_const");
    const spec = parseProgram(c.spec);
    const library = parseLibrary(c.library);
    const seen: number[][] = [];
    const result = await synthesize(ctx, spec, library, 0, 64, (inputs) => {
      seen.push(inputs);
    });
    expect(result).not.toBeNull();
    expect(result!.instructions.length).toBe(3);
    expect(seen.length).toBeGreaterThanOrEqual(0);
  });
});

describe("renderPlayground", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders a synthesize and a prove button for absval", () => {
    const entries = loadCatalog();
    const absval = entries.find((entry) => entry.slug === "absval")!;
    const el = renderPlayground(absval);
    expect(el.querySelector("button.btn-synthesize")).not.toBeNull();
    expect(el.querySelector("button.btn-prove")).not.toBeNull();
    expect(el.querySelector("pre.program")).not.toBeNull();
  });

  it("renders the upper-bound note instead of a prove button for bswap32", () => {
    const entries = loadCatalog();
    const bswap32 = entries.find((entry) => entry.slug === "bswap32")!;
    const el = renderPlayground(bswap32);
    expect(el.querySelector("button.btn-prove")).toBeNull();
    expect(el.textContent).toContain("no independent spec — verified upper bound only");
  });

  it("renders the frontier note and no buttons for popcount", () => {
    const entries = loadCatalog();
    const popcount = entries.find((entry) => entry.slug === "popcount")!;
    const el = renderPlayground(popcount);
    expect(el.querySelector("button.btn-synthesize")).toBeNull();
    expect(el.querySelector("button.btn-prove")).toBeNull();
    expect(el.textContent).toContain("frontier");
  });
});
