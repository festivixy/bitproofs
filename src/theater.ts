import type { Context } from "z3-solver";
import { Library, synthesize } from "./cegis";
import { Program } from "./ir";
import { bitRegister } from "./register";
import { formatProgram } from "./pages";

export interface Recording {
  spec: Program;
  candidates: Program[];
  counterexamples: number[][];
  finalProgram: Program | null;
  elapsedMs: number;
}

export async function recordDerivation(
  ctx: Context<"main">,
  spec8: Program,
  library: Library,
  onDone: (recording: Recording) => void,
): Promise<Recording> {
  const candidates: Program[] = [];
  const counterexamples: number[][] = [];
  const t0 = performance.now();
  const finalProgram = await synthesize(
    ctx,
    spec8,
    library,
    0,
    64,
    (inputs) => counterexamples.push(inputs),
    (program) => candidates.push(program),
  );
  const elapsedMs = Math.round(performance.now() - t0);
  const recording: Recording = { spec: spec8, candidates, counterexamples, finalProgram, elapsedMs };
  onDone(recording);
  return recording;
}

export type Beat =
  | { kind: "candidate"; program: Program; index: number }
  | { kind: "counterexample"; inputs: number[]; index: number }
  | { kind: "strike"; index: number }
  | { kind: "final"; program: Program }
  | { kind: "stamp" };

export function* deriveBeats(recording: Recording): Generator<Beat> {
  const { candidates, counterexamples, finalProgram } = recording;
  const refutedCount = finalProgram !== null ? candidates.length - 1 : candidates.length;
  for (let i = 0; i < refutedCount; i++) {
    yield { kind: "candidate", program: candidates[i], index: i };
    yield { kind: "counterexample", inputs: counterexamples[i], index: i };
    yield { kind: "strike", index: i };
  }
  if (finalProgram !== null) {
    yield { kind: "final", program: finalProgram };
    yield { kind: "stamp" };
  }
}

export function renderProvedStamp(): HTMLElement {
  const stamp = document.createElement("span");
  stamp.className = "proof-stamp";
  stamp.textContent = "PROVED";
  return stamp;
}

export type Scheduler = (fn: () => void, ms: number) => void;

const defaultScheduler: Scheduler = (fn, ms) => {
  setTimeout(fn, ms);
};

export function playDerivation(
  container: HTMLElement,
  recording: Recording,
  beatMs: number,
  schedule: Scheduler = defaultScheduler,
): void {
  const beats = Array.from(deriveBeats(recording));
  let lastCandidateEl: HTMLElement | null = null;

  const renderBeat = (beat: Beat): void => {
    if (beat.kind === "candidate") {
      const pre = document.createElement("pre");
      pre.className = "program theater-candidate";
      pre.textContent = formatProgram(beat.program);
      container.appendChild(pre);
      lastCandidateEl = pre;
    } else if (beat.kind === "counterexample") {
      const register = bitRegister(beat.inputs[0] ?? 0, recording.spec.width);
      register.className = `${register.className} theater-counterexample`;
      container.appendChild(register);
    } else if (beat.kind === "strike") {
      if (lastCandidateEl !== null) {
        lastCandidateEl.className = `${lastCandidateEl.className} theater-refuted`;
      }
    } else if (beat.kind === "final") {
      const pre = document.createElement("pre");
      pre.className = "program theater-candidate theater-proved";
      pre.textContent = formatProgram(beat.program);
      container.appendChild(pre);
      lastCandidateEl = pre;
    } else {
      container.appendChild(renderProvedStamp());
    }
  };

  const step = (index: number): void => {
    if (index >= beats.length) {
      appendCaption(container, recording.elapsedMs);
      return;
    }
    renderBeat(beats[index]);
    schedule(() => step(index + 1), beatMs);
  };

  step(0);
}

function appendCaption(container: HTMLElement, elapsedMs: number): void {
  const caption = document.createElement("p");
  caption.className = "theater-caption dim";
  caption.textContent = `every event above is from the run your browser just executed — the real run took ${elapsedMs}ms; replayed slowly so you can watch.`;
  container.appendChild(caption);
}
