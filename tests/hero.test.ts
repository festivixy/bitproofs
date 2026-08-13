import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog";
import { HERO_PLACEHOLDER_TEXT, renderList } from "../src/pages";
import { installFakeDocument } from "./dom-shim";

describe("hero stat band", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("derives its counts from loadCatalog(), not a literal", () => {
    const entries = loadCatalog();
    const expectedProven = entries.filter((entry) => entry.tier.includes("proven")).length;
    const el = renderList(entries);
    const band = el.querySelector("p.stat-band")!;
    expect(band.textContent).toContain(`${entries.length} tricks`);
    expect(band.textContent).toContain(`${expectedProven} proven minimal`);
    expect(band.textContent).toContain("every proof covers all 4,294,967,296 inputs");
    expect(band.textContent).toContain("0 taken on faith");
  });

  it("does not hardcode the proven count as a magic literal that could drift", () => {
    const entries = loadCatalog();
    const provenTiers = entries.filter((entry) => entry.tier.includes("proven"));
    const el = renderList(entries);
    const band = el.querySelector("p.stat-band")!;
    expect(band.textContent).toContain(`${provenTiers.length} proven minimal`);
  });
});

describe("hero placeholder", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders a static warming-up placeholder without touching z3", () => {
    const entries = loadCatalog();
    const el = renderList(entries);
    const theater = el.querySelector("div.hero-theater")!;
    expect(theater).not.toBeNull();
    expect(theater.textContent).toContain(HERO_PLACEHOLDER_TEXT);
  });
});
