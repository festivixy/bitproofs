import { CatalogEntry } from "./catalog";
import { Library, synthesize } from "./cegis";
import { equivalent } from "./equiv";
import { Op, Program } from "./ir";
import { formatProgram, renderBackLink } from "./pages";
import { getContext } from "./z3";

const TIMEOUT_MS = 10_000;

export function withTimeout<T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function deriveLibrary(entry: CatalogEntry): Library | null {
  const program = entry.program;
  if (program === null) return null;
  const ops: Op[] = [];
  const constants = new Set<number>();
  for (const instruction of program.instructions) {
    ops.push(instruction.op);
    for (const operand of instruction.operands) {
      if (operand.kind === "const") constants.add(operand.value);
    }
  }
  return { ops, nConstants: constants.size, fixedConstants: [] };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function statusLine(className: string, text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

async function runSynthesis(
  target: Program,
  library: Library,
  button: HTMLButtonElement,
  status: HTMLElement,
): Promise<void> {
  button.disabled = true;
  status.textContent = "";
  const t0 = performance.now();
  const deriving = statusLine("status-deriving", "deriving…");
  status.appendChild(deriving);
  const ticker = setInterval(() => {
    deriving.textContent = `deriving… ${Math.round(performance.now() - t0)}ms`;
  }, 100);
  let exampleCount = 0;
  try {
    const ctx = await getContext();
    const program = await withTimeout(
      synthesize(ctx, target, library, 0, 64, () => {
        exampleCount += 1;
      }),
    );
    clearInterval(ticker);
    status.textContent = "";
    if (program === null) {
      status.appendChild(
        statusLine("status-failure", "solver gave up: no program satisfies this component library"),
      );
      return;
    }
    const elapsed = Math.round(performance.now() - t0);
    const pre = document.createElement("pre");
    pre.className = "program";
    pre.textContent = formatProgram(program);
    status.appendChild(pre);
    status.appendChild(
      statusLine("status-success", `derived in ${elapsed}ms after ${exampleCount} counterexamples`),
    );
  } catch (error) {
    clearInterval(ticker);
    status.textContent = "";
    status.appendChild(statusLine("status-failure", `solver gave up: ${errorMessage(error)}`));
  } finally {
    button.disabled = false;
  }
}

function renderSynthesizeSection(target: Program, library: Library): HTMLElement {
  const section = document.createElement("div");
  section.className = "playground-action";

  const button = document.createElement("button");
  button.className = "btn-synthesize";
  button.textContent = "synthesize (8-bit)";
  section.appendChild(button);

  const status = document.createElement("div");
  status.className = "playground-status";
  section.appendChild(status);

  button.onclick = () => {
    void runSynthesis(target, library, button, status);
  };

  return section;
}

async function runProof(
  program: Program,
  spec: Program,
  button: HTMLButtonElement,
  status: HTMLElement,
): Promise<void> {
  button.disabled = true;
  status.textContent = "";
  const t0 = performance.now();
  status.appendChild(statusLine("status-progress", "proving…"));
  try {
    const ctx = await getContext();
    const result = await withTimeout(equivalent(ctx, program, spec));
    const elapsed = Math.round(performance.now() - t0);
    status.textContent = "";
    if (result.kind === "equivalent") {
      status.appendChild(
        statusLine("status-success", `UNSAT — no input distinguishes them (${elapsed}ms)`),
      );
    } else {
      status.appendChild(
        statusLine("status-failure", `solver found a counterexample: ${JSON.stringify(result.inputs)}`),
      );
    }
  } catch (error) {
    status.textContent = "";
    status.appendChild(statusLine("status-failure", `solver gave up: ${errorMessage(error)}`));
  } finally {
    button.disabled = false;
  }
}

function renderProveSection(program: Program, spec: Program): HTMLElement {
  const section = document.createElement("div");
  section.className = "playground-action";

  const button = document.createElement("button");
  button.className = "btn-prove";
  button.textContent = "prove at 32-bit";
  section.appendChild(button);

  const status = document.createElement("div");
  status.className = "playground-status";
  section.appendChild(status);

  button.onclick = () => {
    void runProof(program, spec, button, status);
  };

  return section;
}

export function renderPlayground(entry: CatalogEntry): HTMLElement {
  const el = document.createElement("div");
  el.className = "playground";

  const title = document.createElement("h1");
  title.textContent = `${entry.title} — live`;
  el.appendChild(title);

  const library = deriveLibrary(entry);

  if (library === null) {
    el.appendChild(
      statusLine(
        "frontier-note",
        `${entry.tier} — no derived program exists yet, so there is nothing to synthesize toward or prove.`,
      ),
    );
    el.appendChild(renderBackLink(`#/e/${entry.slug}`, "back to entry"));
    return el;
  }

  const targetHeading = document.createElement("h2");
  targetHeading.textContent = "target (8-bit)";
  el.appendChild(targetHeading);

  const target8 = entry.spec_8bit ?? entry.program_8bit;
  if (target8 !== null) {
    const pre = document.createElement("pre");
    pre.className = "program";
    pre.textContent = formatProgram(target8);
    el.appendChild(pre);
    el.appendChild(renderSynthesizeSection(target8, library));
  } else {
    el.appendChild(
      statusLine("dim", "no 8-bit form: this trick only exists at its full bit width."),
    );
  }

  const proveHeading = document.createElement("h2");
  proveHeading.textContent = "proof at 32-bit";
  el.appendChild(proveHeading);

  if (entry.program !== null && entry.spec !== null) {
    el.appendChild(renderProveSection(entry.program, entry.spec));
  } else {
    el.appendChild(statusLine("dim", "no independent spec — verified upper bound only"));
  }

  el.appendChild(renderBackLink(`#/e/${entry.slug}`, "back to entry"));
  return el;
}
