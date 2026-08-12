import { beforeAll, describe, expect, it } from "vitest";
import { libraryFromProgram, librariesOfSize, renderCustom } from "../src/custom";
import { parseExpr } from "../src/expr";
import { installFakeDocument, installFakeLocation } from "./dom-shim";

describe("libraryFromProgram", () => {
  it("derives ops and n_constants from a parsed program", () => {
    const program = parseExpr("x & (x - 1)", 8);
    const library = libraryFromProgram(program);
    expect(library.ops.slice().sort()).toEqual(["and", "sub"]);
    expect(library.nConstants).toBe(1);
    expect(library.fixedConstants).toEqual([]);
  });

  it("counts every const operand, not just distinct values", () => {
    const program = parseExpr("(x & 1) | (x & 1)", 8);
    const library = libraryFromProgram(program);
    expect(library.nConstants).toBe(2);
  });
});

describe("librariesOfSize", () => {
  it("has exactly 11 libraries at size 1, each over a single op with 2 constants", () => {
    const libraries = librariesOfSize(1);
    expect(libraries.length).toBe(11);
    for (const library of libraries) {
      expect(library.ops.length).toBe(1);
      expect(library.nConstants).toBe(2);
      expect(library.fixedConstants).toEqual([]);
    }
    const uniqueSingles = new Set(libraries.map((l) => l.ops[0]));
    expect(uniqueSingles.size).toBe(11);
  });

  it("has exactly 66 libraries at size 2, each with 4 constants", () => {
    const libraries = librariesOfSize(2);
    expect(libraries.length).toBe(66);
    for (const library of libraries) {
      expect(library.ops.length).toBe(2);
      expect(library.nConstants).toBe(4);
    }
  });
});

describe("renderCustom", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders an input for the custom expression", () => {
    const el = renderCustom();
    expect(el.querySelector("input.custom-input")).not.toBeNull();
  });

  it("renders the parse error verbatim for an invalid expression", () => {
    const el = renderCustom();
    const input = el.querySelector("input.custom-input") as unknown as { value: string };
    const form = el.querySelector("form.custom-form") as unknown as {
      onsubmit: (event: { preventDefault: () => void }) => void;
    };
    input.value = "y";
    form.onsubmit({ preventDefault: () => {} });
    expect(el.textContent).toContain("unknown identifier 'y'");
  });

  it("renders the parsed program and a derive button, hiding hunt at length 1", () => {
    const el = renderCustom();
    const input = el.querySelector("input.custom-input") as unknown as { value: string };
    const form = el.querySelector("form.custom-form") as unknown as {
      onsubmit: (event: { preventDefault: () => void }) => void;
    };
    input.value = "x";
    form.onsubmit({ preventDefault: () => {} });
    expect(el.querySelector("pre.program")).not.toBeNull();
    expect(el.querySelector("button.btn-synthesize")).not.toBeNull();
    expect(el.querySelector("button.btn-hunt")).toBeNull();
  });

  it("shows the hunt button once the parsed program has 2 or more instructions", () => {
    const el = renderCustom();
    const input = el.querySelector("input.custom-input") as unknown as { value: string };
    const form = el.querySelector("form.custom-form") as unknown as {
      onsubmit: (event: { preventDefault: () => void }) => void;
    };
    input.value = "x & (x - 1)";
    form.onsubmit({ preventDefault: () => {} });
    expect(el.querySelector("button.btn-hunt")).not.toBeNull();
  });

  it("prefills the input from the ?e= query param in location.hash", () => {
    installFakeLocation("#/play/custom?e=x%20%26%20(x%20-%201)");
    const el = renderCustom();
    const input = el.querySelector("input.custom-input") as unknown as { value: string };
    expect(input.value).toBe("x & (x - 1)");
    installFakeLocation("");
  });

  it("leaves the input untouched when location.hash has no query param", () => {
    installFakeLocation("#/play/custom");
    const el = renderCustom();
    const input = el.querySelector("input.custom-input") as unknown as { value: string };
    expect(input.value).toBeUndefined();
  });
});
