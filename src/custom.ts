import { Library, synthesize } from "./cegis";
import { OPS, Op, Program } from "./ir";
import { errorMessage, runSynthesis, statusLine, withTimeout } from "./playground";
import { formatProgram, renderBackLink } from "./pages";
import { parseExpr } from "./expr";
import { getContext } from "./z3";

const WIDTH = 8;
const HUNT_SIZES = [1, 2];

export function libraryFromProgram(program: Program): Library {
  const ops: Op[] = [];
  let nConstants = 0;
  for (const instruction of program.instructions) {
    ops.push(instruction.op);
    for (const operand of instruction.operands) {
      if (operand.kind === "const") nConstants += 1;
    }
  }
  return { ops, nConstants, fixedConstants: [] };
}

function combinationsWithReplacement<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  function extend(start: number): void {
    if (combo.length === size) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]);
      extend(i);
      combo.pop();
    }
  }
  extend(0);
  return result;
}

export function librariesOfSize(size: number): Library[] {
  return combinationsWithReplacement(OPS, size).map((ops) => ({
    ops,
    nConstants: 2 * size,
    fixedConstants: [],
  }));
}

function renderDeriveSection(target: Program, library: Library): HTMLElement {
  const section = document.createElement("div");
  section.className = "playground-action";

  const button = document.createElement("button");
  button.className = "btn-synthesize";
  button.textContent = "derive this shape (8-bit)";
  section.appendChild(button);

  const status = document.createElement("div");
  status.className = "playground-status";
  section.appendChild(status);

  button.onclick = () => {
    void runSynthesis(target, library, button, status);
  };

  return section;
}

async function runHunt(
  target: Program,
  parsedLength: number,
  button: HTMLButtonElement,
  status: HTMLElement,
): Promise<void> {
  button.disabled = true;
  status.textContent = "";
  const progress = statusLine("status-progress", "sweeping…");
  status.appendChild(progress);
  const sizes = HUNT_SIZES.filter((size) => size < parsedLength);
  try {
    for (const size of sizes) {
      const libraries = librariesOfSize(size);
      for (let i = 0; i < libraries.length; i++) {
        progress.textContent = `sweeping library ${i + 1}/${libraries.length}…`;
        const ctx = await getContext();
        const program = await withTimeout(synthesize(ctx, target, libraries[i]));
        if (program !== null) {
          status.textContent = "";
          const pre = document.createElement("pre");
          pre.className = "program";
          pre.textContent = formatProgram(program);
          status.appendChild(pre);
          status.appendChild(
            statusLine(
              "status-success",
              "found at 8 bits — a shorter 8-bit form does not always survive at 32 bits; only the offline pipeline certifies floors.",
            ),
          );
          return;
        }
      }
    }
    status.textContent = "";
    status.appendChild(
      statusLine(
        "dim",
        "nothing shorter at 8 bits under 2 ops — this is an 8-bit search, not a proof about 32 bits.",
      ),
    );
  } catch (error) {
    status.textContent = "";
    status.appendChild(statusLine("status-failure", `solver gave up: ${errorMessage(error)}`));
  } finally {
    button.disabled = false;
  }
}

function renderHuntSection(target: Program, parsedLength: number): HTMLElement {
  const section = document.createElement("div");
  section.className = "playground-action";

  const button = document.createElement("button");
  button.className = "btn-hunt";
  button.textContent = "hunt for something shorter (8-bit)";
  section.appendChild(button);

  const status = document.createElement("div");
  status.className = "playground-status";
  section.appendChild(status);

  button.onclick = () => {
    void runHunt(target, parsedLength, button, status);
  };

  return section;
}

function renderParsed(program: Program): HTMLElement {
  const container = document.createElement("div");

  const pre = document.createElement("pre");
  pre.className = "program";
  pre.textContent = formatProgram(program);
  container.appendChild(pre);

  const library = libraryFromProgram(program);
  container.appendChild(renderDeriveSection(program, library));

  const length = program.instructions.length;
  if (length > 1) {
    container.appendChild(renderHuntSection(program, length));
  }

  return container;
}

export function renderCustom(): HTMLElement {
  const el = document.createElement("div");
  el.className = "playground custom-playground";

  const title = document.createElement("h1");
  title.textContent = "custom expression";
  el.appendChild(title);

  const form = document.createElement("form");
  form.className = "custom-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "custom-input";
  input.placeholder = "x & (x - 1)";
  const queryIndex = location.hash.indexOf("?");
  if (queryIndex !== -1) {
    const prefill = new URLSearchParams(location.hash.slice(queryIndex + 1)).get("e");
    if (prefill !== null) input.value = prefill;
  }
  form.appendChild(input);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn-parse";
  submit.textContent = "parse";
  form.appendChild(submit);

  el.appendChild(form);

  const result = document.createElement("div");
  result.className = "custom-result";
  el.appendChild(result);

  form.onsubmit = (event: Event) => {
    event.preventDefault();
    result.textContent = "";
    let program: Program;
    try {
      program = parseExpr(input.value, WIDTH);
    } catch (error) {
      result.appendChild(statusLine("status-failure", errorMessage(error)));
      return;
    }
    result.appendChild(renderParsed(program));
  };

  el.appendChild(renderBackLink("#/", "back to catalog"));
  return el;
}
