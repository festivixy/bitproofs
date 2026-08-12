import { Program, parseProgram } from "./ir";
import { Library, parseLibrary, synthesize } from "./cegis";
import { equivalent } from "./equiv";
import synthesisVectors from "../vectors/synthesis_vectors.json";
import equivVectors from "../vectors/equiv_vectors.json";

export interface BatteryRow {
  name: string;
  ms: number;
  outcome: string;
}

export async function runBattery(ctx: any, report: (row: BatteryRow) => void): Promise<void> {
  for (const c of (synthesisVectors as any).cases) {
    const spec = parseProgram(c.spec);
    const library: Library = parseLibrary(c.library);
    const t0 = performance.now();
    const result = await synthesize(ctx, spec, library);
    const ms = performance.now() - t0;
    const ok = c.expected_found ? result !== null && result.instructions.length === c.expected_length : result === null;
    report({ name: `synth ${c.name}`, ms, outcome: ok ? "ok" : "MISMATCH" });
  }
  const pairs32 = (equivVectors as any).cases.filter((c: any) => c.a.width === 32).slice(0, 6);
  for (const [i, c] of pairs32.entries()) {
    const a: Program = parseProgram(c.a);
    const b: Program = parseProgram(c.b);
    const t0 = performance.now();
    const result = await equivalent(ctx, a, b);
    const ms = performance.now() - t0;
    const ok = (result.kind === "equivalent" ? "equivalent" : "counterexample") === c.verdict;
    report({ name: `equiv32 case ${i}`, ms, outcome: ok ? "ok" : "MISMATCH" });
  }
}
