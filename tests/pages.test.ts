import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog";
import { renderEntry, renderList } from "../src/pages";
import { installFakeDocument } from "./dom-shim";

describe("renderList hero", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders the hero heading above the catalog index", () => {
    const entries = loadCatalog();
    const el = renderList(entries);
    expect(el.textContent).toContain("Compilers guess. This proves.");
    expect(el.querySelector("a.hero-cta")).not.toBeNull();
  });
});

describe("renderEntry expression line", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("shows the expression and an open-in-playground link for an arity-1 entry", () => {
    const entries = loadCatalog();
    const clearLowestBit = entries.find((entry) => entry.slug === "clear_lowest_bit")!;
    const el = renderEntry(clearLowestBit);
    const line = el.querySelector("p.expr-line");
    expect(line).not.toBeNull();
    expect(line!.textContent).toContain("as one expression:");
    const link = el.querySelector("a.try-own-link") as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.href).toContain("#/play/custom?e=");
  });

  it("omits the open-in-playground link for an arity-2 entry", () => {
    const entries = loadCatalog();
    const absDiff = entries.find((entry) => entry.slug === "abs_diff")!;
    const el = renderEntry(absDiff);
    expect(el.querySelector("a.try-own-link")).toBeNull();
  });
});
