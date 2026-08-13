import { beforeAll, describe, expect, it } from "vitest";
import { deriveBeats, playDerivation, Recording } from "../src/theater";
import { Program } from "../src/ir";
import { installFakeDocument } from "./dom-shim";

function makeProgram(tag: number): Program {
  return {
    width: 8,
    instructions: [
      { op: "add", operands: [{ kind: "input", index: 0 }, { kind: "const", value: tag }] },
    ],
    output: { kind: "result", index: 0 },
  };
}

function makeRecording(refutedCount: number, hasFinal: boolean): Recording {
  const candidates: Program[] = [];
  const counterexamples: number[][] = [];
  for (let i = 0; i < refutedCount; i++) {
    candidates.push(makeProgram(i));
    counterexamples.push([i]);
  }
  const finalProgram = hasFinal ? makeProgram(99) : null;
  if (finalProgram !== null) candidates.push(finalProgram);
  return { spec: makeProgram(0), candidates, counterexamples, finalProgram, elapsedMs: 42 };
}

describe("deriveBeats", () => {
  it("orders beats as candidate, cex, strike per refuted candidate, then final, stamp", () => {
    const recording = makeRecording(2, true);
    const kinds = Array.from(deriveBeats(recording)).map((beat) => beat.kind);
    expect(kinds).toEqual([
      "candidate", "counterexample", "strike",
      "candidate", "counterexample", "strike",
      "final", "stamp",
    ]);
  });

  it("stops after the refuted candidates when no final program was found", () => {
    const recording = makeRecording(2, false);
    const kinds = Array.from(deriveBeats(recording)).map((beat) => beat.kind);
    expect(kinds).toEqual([
      "candidate", "counterexample", "strike",
      "candidate", "counterexample", "strike",
    ]);
  });

  it("emits only final and stamp when nothing was ever refuted", () => {
    const recording = makeRecording(0, true);
    const kinds = Array.from(deriveBeats(recording)).map((beat) => beat.kind);
    expect(kinds).toEqual(["final", "stamp"]);
  });
});

describe("playDerivation driven by a zero-delay scheduler", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("steps through every beat and renders them in order", () => {
    const recording = makeRecording(2, true);
    const container = document.createElement("div");
    const calls: number[] = [];
    const zeroDelay = (fn: () => void, ms: number): void => {
      calls.push(ms);
      fn();
    };

    playDerivation(container, recording, 900, zeroDelay);

    expect(calls.length).toBe(8);
    expect(calls.every((ms) => ms === 900)).toBe(true);

    const kids = container.children;
    expect(kids.length).toBe(7);
    expect(kids[0].className).toContain("theater-candidate");
    expect(kids[0].className).toContain("theater-refuted");
    expect(kids[2].className).toContain("theater-refuted");
    expect(kids[4].className).toContain("theater-proved");
    expect(kids[5].className).toBe("proof-stamp");
    expect(kids[5].textContent).toBe("PROVED");
    expect(kids[6].textContent).toBe(
      "every event above is from the run your browser just executed — the real run took 42ms; replayed slowly so you can watch.",
    );
  });

  it("still appends the honest caption when the solver never found a final program", () => {
    const recording = makeRecording(1, false);
    const container = document.createElement("div");
    const zeroDelay = (fn: () => void): void => fn();

    playDerivation(container, recording, 900, zeroDelay);

    const kids = container.children;
    expect(kids.length).toBe(3);
    expect(kids[0].className).toContain("theater-refuted");
    expect(kids[kids.length - 1].textContent).toContain("the real run took 42ms");
  });
});
