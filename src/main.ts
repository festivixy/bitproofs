import { getContext } from "./z3";
import { runBattery } from "./battery";

const out = document.getElementById("out")!;

function line(text: string): void {
  out.textContent += `\n${text}`;
}

async function main(): Promise<void> {
  out.textContent = `crossOriginIsolated: ${crossOriginIsolated}`;
  try {
    const t0 = performance.now();
    const ctx = await getContext();
    line(`z3 init: ${Math.round(performance.now() - t0)}ms`);
    await runBattery(ctx, (row) => line(`${row.name}: ${Math.round(row.ms)}ms ${row.outcome}`));
    line("battery complete");
  } catch (error) {
    line(`FAILED: ${String(error)}`);
  }
}

main();
