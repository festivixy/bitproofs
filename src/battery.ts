import { Program, parseProgram } from "./ir";
import { Library, parseLibrary, synthesize } from "./cegis";
import { equivalent } from "./equiv";
import { execute } from "./interp";
import synthesisVectors from "../vectors/synthesis_vectors.json";
import equivVectors from "../vectors/equiv_vectors.json";

export interface BatteryRow {
  name: string;
  ms: number;
  outcome: string;
}

async function synthOutcome(ctx: any, c: any): Promise<string> {
  const spec = parseProgram(c.spec);
  const library: Library = parseLibrary(c.library);
  const result = await synthesize(ctx, spec, library);
  if (!c.expected_found) return result === null ? "ok" : "MISMATCH";
  if (result === null || result.instructions.length !== c.expected_length) {
    return "MISMATCH";
  }
  const proof = await equivalent(ctx, result, spec);
  return proof.kind === "equivalent" ? "ok (proof-verified)" : "MISMATCH";
}

async function equivOutcome(ctx: any, c: any): Promise<string> {
  const a: Program = parseProgram(c.a);
  const b: Program = parseProgram(c.b);
  const result = await equivalent(ctx, a, b);
  const verdict = result.kind === "equivalent" ? "equivalent" : "counterexample";
  if (verdict !== c.verdict) return "MISMATCH";
  if (result.kind === "counterexample" && execute(a, result.inputs) === execute(b, result.inputs)) {
    return "MISMATCH";
  }
  return "ok";
}

export async function runBattery(ctx: any, report: (row: BatteryRow) => void): Promise<void> {
  for (const c of (synthesisVectors as any).cases) {
    const t0 = performance.now();
    let outcome: string;
    try {
      outcome = await synthOutcome(ctx, c);
    } catch (error) {
      outcome = `ERROR ${String(error)}`;
    }
    report({ name: `synth ${c.name}`, ms: performance.now() - t0, outcome });
  }
  const pairs32 = (equivVectors as any).cases.filter((c: any) => c.a.width === 32).slice(0, 6);
  for (const [i, c] of pairs32.entries()) {
    const t0 = performance.now();
    let outcome: string;
    try {
      outcome = await equivOutcome(ctx, c);
    } catch (error) {
      outcome = `ERROR ${String(error)}`;
    }
    report({ name: `equiv32 case ${i}`, ms: performance.now() - t0, outcome });
  }
}
