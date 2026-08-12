import { Program, countInputs } from "./ir";
import { encode } from "./encode";

export type EquivResult =
  | { kind: "equivalent" }
  | { kind: "counterexample"; inputs: number[] };

export async function equivalent(ctx: any, a: Program, b: Program): Promise<EquivResult> {
  if (a.width !== b.width) throw new Error("width mismatch");
  const nInputs = Math.max(countInputs(a), countInputs(b));
  const ea = encode(ctx, a, nInputs);
  const eb = encode(ctx, b, nInputs);
  const solver = new ctx.Solver();
  solver.add(ea.output.neq(eb.output));
  const verdict = await solver.check();
  if (verdict === "unsat") return { kind: "equivalent" };
  if (verdict !== "sat") throw new Error(`solver returned ${verdict}`);
  const model = solver.model();
  const inputs = ea.inputs.map((v: any) => Number(model.eval(v, true).value()));
  return { kind: "counterexample", inputs };
}
