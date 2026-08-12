import { Operand, Program } from "./ir";
import { CatalogEntry } from "./catalog";

const SUPEROPT_REPO = "https://github.com/festivixy/superopt";
const LLVM_ISSUE = "https://github.com/llvm/llvm-project/issues/212908";

const COMPILER_LABELS: Record<string, string> = {
  gcc_base: "gcc (base)",
  gcc_v3: "gcc (-O3)",
  clang_base: "clang (base)",
  clang_v3: "clang (-O3)",
};

function tierBadgeClass(tier: string): string {
  if (tier.includes("proven")) return "badge-proven";
  if (tier.includes("best found")) return "badge-best";
  if (tier.includes("verified upper bound")) return "badge-upper";
  return "badge-none";
}

function renderBadge(tier: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `badge ${tierBadgeClass(tier)}`;
  badge.textContent = tier;
  return badge;
}

function formatOperand(operand: Operand): string {
  if (operand.kind === "input") return `in${operand.index}`;
  if (operand.kind === "const") return String(operand.value);
  return `r${operand.index}`;
}

export function formatProgram(program: Program): string {
  const lines = program.instructions.map((instruction, index) => {
    const operands = instruction.operands.map(formatOperand).join(" ");
    return `r${index} = ${instruction.op} ${operands}`;
  });
  lines.push(`-> ${formatOperand(program.output)}`);
  return lines.join("\n");
}

export function renderBackLink(href: string, text: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "back-link";
  link.href = href;
  link.textContent = text;
  return link;
}

function renderCompilerTable(entry: CatalogEntry): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "compiler-table";

  const headerRow = document.createElement("tr");
  for (const key of Object.keys(COMPILER_LABELS)) {
    const th = document.createElement("th");
    th.textContent = COMPILER_LABELS[key];
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  const dataRow = document.createElement("tr");
  for (const key of Object.keys(COMPILER_LABELS)) {
    const td = document.createElement("td");
    const count = entry.compilers[key];
    const link = entry.godbolt[key];
    if (count === null || count === undefined) {
      td.textContent = "—";
    } else if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.textContent = String(count);
      td.appendChild(a);
    } else {
      td.textContent = String(count);
    }
    dataRow.appendChild(td);
  }
  table.appendChild(dataRow);

  return table;
}

function renderExampleTable(entry: CatalogEntry): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "example-table";

  const headerLabels = entry.arity === 2 ? ["in0", "in1", "out"] : ["in0", "out"];
  const headerRow = document.createElement("tr");
  for (const label of headerLabels) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  for (const row of entry.example_8bit) {
    const tr = document.createElement("tr");
    for (const value of [...row.inputs, row.output]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  return table;
}

function renderRegister(): HTMLSpanElement {
  const register = document.createElement("span");
  register.className = "register";
  for (let i = 0; i < 8; i++) {
    const bit = document.createElement("span");
    bit.className = `bit ${i % 2 === 0 ? "bit-set" : "bit-clear"}`;
    register.appendChild(bit);
  }
  return register;
}

export function renderHeader(): HTMLElement {
  const header = document.createElement("header");
  header.className = "site-header";

  const brandBlock = document.createElement("div");
  brandBlock.className = "brand-block";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "#/";
  brand.appendChild(renderRegister());
  const wordmark = document.createElement("span");
  wordmark.className = "wordmark";
  wordmark.textContent = "bitproofs";
  brand.appendChild(wordmark);
  brandBlock.appendChild(brand);

  const tagline = document.createElement("p");
  tagline.className = "tagline";
  tagline.textContent = "bit tricks, machine-proven.";
  brandBlock.appendChild(tagline);

  header.appendChild(brandBlock);

  const nav = document.createElement("nav");
  const aboutLink = document.createElement("a");
  aboutLink.href = "#/about";
  aboutLink.textContent = "about";
  const scopeLink = document.createElement("a");
  scopeLink.href = "#/scope";
  scopeLink.textContent = "scope";
  nav.appendChild(aboutLink);
  nav.appendChild(scopeLink);
  header.appendChild(nav);

  return header;
}

export function renderFooter(): HTMLElement {
  const footer = document.createElement("footer");
  footer.className = "site-footer";

  const links = document.createElement("p");
  const repoLink = document.createElement("a");
  repoLink.href = SUPEROPT_REPO;
  repoLink.textContent = "superopt on GitHub";
  links.appendChild(repoLink);
  footer.appendChild(links);

  const credit = document.createElement("p");
  credit.className = "dim";
  credit.textContent = "inspired by Sean Anderson's Bit Twiddling Hacks and Hacker's Delight.";
  footer.appendChild(credit);

  const claim = document.createElement("p");
  claim.className = "dim";
  claim.textContent = "every claim on this site is checked by Z3; the engine is open source.";
  footer.appendChild(claim);

  return footer;
}

export function renderList(entries: CatalogEntry[]): HTMLElement {
  const el = document.createElement("div");
  el.className = "catalog-list";

  const heading = document.createElement("h1");
  heading.textContent = "the catalog";
  el.appendChild(heading);

  const table = document.createElement("table");
  table.className = "catalog-table";

  const headerRow = document.createElement("tr");
  for (const label of ["name", "tier", "instructions", "category"]) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  }
  table.appendChild(headerRow);

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.className = "catalog-row";

    const nameCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = `#/e/${entry.slug}`;
    link.textContent = entry.title;
    nameCell.appendChild(link);
    row.appendChild(nameCell);

    const tierCell = document.createElement("td");
    tierCell.appendChild(renderBadge(entry.tier));
    row.appendChild(tierCell);

    const countCell = document.createElement("td");
    countCell.textContent = entry.program !== null ? String(entry.program.instructions.length) : "—";
    row.appendChild(countCell);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = entry.category;
    row.appendChild(categoryCell);

    table.appendChild(row);
  }

  el.appendChild(table);
  return el;
}

export function renderEntry(entry: CatalogEntry): HTMLElement {
  const el = document.createElement("article");
  el.className = "entry";

  const title = document.createElement("h1");
  title.textContent = entry.title;
  el.appendChild(title);

  const description = document.createElement("p");
  description.className = "description";
  description.textContent = entry.description;
  el.appendChild(description);

  el.appendChild(renderBadge(entry.tier));

  if (entry.program !== null) {
    const label = document.createElement("h2");
    label.textContent = "optimal program";
    el.appendChild(label);

    const pre = document.createElement("pre");
    pre.className = "program";
    pre.textContent = formatProgram(entry.program);
    el.appendChild(pre);
  }

  if (entry.floor_note !== "") {
    const p = document.createElement("p");
    p.className = "floor-note";
    p.textContent = entry.floor_note;
    el.appendChild(p);
  }

  if (entry.cost_note !== "") {
    const p = document.createElement("p");
    p.className = "cost-note";
    p.textContent = entry.cost_note;
    el.appendChild(p);
  }

  const compilerHeading = document.createElement("h2");
  compilerHeading.textContent = "compiler instruction counts";
  el.appendChild(compilerHeading);
  el.appendChild(renderCompilerTable(entry));

  const exampleHeading = document.createElement("h2");
  exampleHeading.textContent = "8-bit examples";
  el.appendChild(exampleHeading);
  el.appendChild(renderExampleTable(entry));

  if (entry.program_8bit !== null) {
    const link = document.createElement("a");
    link.className = "derive-link";
    link.href = `#/play/${entry.slug}`;
    link.textContent = "derive it live";
    el.appendChild(link);
  }

  el.appendChild(renderBackLink("#/", "back to catalog"));

  return el;
}

export function renderAbout(): HTMLElement {
  const el = document.createElement("article");
  el.className = "about";

  const heading = document.createElement("h1");
  heading.textContent = "about";
  el.appendChild(heading);

  const p1 = document.createElement("p");
  p1.textContent =
    "superopt is a provably-optimal superoptimizer for short, loop-free integer and bitwise routines, built on the Z3 SMT solver.";
  el.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent =
    "Every result on this site passes two independent checks: an SMT equivalence proof against a reference specification, and a random-input fuzzer written without reusing any of the encoder's code. A result is only reported as optimal when both layers agree.";
  el.appendChild(p2);

  const p3 = document.createElement("p");
  p3.textContent =
    'Synthesis uses CEGIS (counterexample-guided inductive synthesis), a technique from Jha, Gulwani, Seshia, and Tiwari’s 2010 paper "Oracle-Guided Component-Based Program Synthesis" — not a novel contribution of this project.';
  el.appendChild(p3);

  const links = document.createElement("p");
  const repoLink = document.createElement("a");
  repoLink.href = SUPEROPT_REPO;
  repoLink.textContent = "superopt on GitHub";
  links.appendChild(repoLink);
  links.appendChild(document.createTextNode(" · "));
  const issueLink = document.createElement("a");
  issueLink.href = LLVM_ISSUE;
  issueLink.textContent = "the LLVM issue";
  links.appendChild(issueLink);
  el.appendChild(links);

  el.appendChild(renderBackLink("#/", "back to catalog"));

  return el;
}

export function renderScope(): HTMLElement {
  const el = document.createElement("article");
  el.className = "scope";

  const heading = document.createElement("h1");
  heading.textContent = "scope";
  el.appendChild(heading);

  const covers = document.createElement("p");
  covers.textContent =
    "The IR covers loop-free, single-output, integer and bitwise programs at power-of-two bit widths (8, 16, 32).";
  el.appendChild(covers);

  const excludes = document.createElement("p");
  excludes.textContent =
    "It excludes branches, comparisons as outputs, loops, floating point, and memory operations. Each of these is out of scope for now, not proven infeasible.";
  el.appendChild(excludes);

  el.appendChild(renderBackLink("#/", "back to catalog"));

  return el;
}
