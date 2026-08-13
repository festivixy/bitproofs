import "./style.css";
import { CatalogEntry, loadCatalog } from "./catalog";
import {
  HEADER_REGISTER_INITIAL,
  renderAbout,
  renderEntry,
  renderFooter,
  renderHeader,
  renderList,
  renderScope,
  updateRegisterBits,
} from "./pages";
import { renderPlayground } from "./playground";
import { renderCustom } from "./custom";
import { getContext } from "./z3";
import { runBattery } from "./battery";
import { Library } from "./cegis";
import { recordDerivation, playDerivation } from "./theater";

const app = document.getElementById("app")!;
const entries = loadCatalog();

const ABSVAL_LIBRARY: Library = { ops: ["ashr", "xor", "sub"], nConstants: 0, fixedConstants: [] };
const HERO_BEAT_MS = 900;
const REGISTER_INTERVAL_MS = 2000;

function startHeroTheater(): void {
  const theater = document.querySelector(".hero-theater") as HTMLElement | null;
  if (theater === null) return;
  const absval = findEntry("absval");
  const spec8 = absval?.spec_8bit;
  if (!spec8) return;
  (async () => {
    try {
      const ctx = await getContext();
      const recording = await recordDerivation(ctx, spec8, ABSVAL_LIBRARY, () => {});
      theater.textContent = "";
      playDerivation(theater, recording, HERO_BEAT_MS);
    } catch {
      theater.textContent = "";
      const p = document.createElement("p");
      p.className = "hero-theater-placeholder dim";
      p.textContent = "the prover could not start in this browser — the catalog below is fully precomputed.";
      theater.appendChild(p);
    }
  })();
}

let headerRegisterValue = HEADER_REGISTER_INITIAL;

function startHeaderCounter(): void {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  setInterval(() => {
    if (reducedMotionQuery.matches) return;
    headerRegisterValue = (headerRegisterValue + 1) % 256;
    const register = document.querySelector(".site-header .register") as HTMLElement | null;
    if (register !== null) updateRegisterBits(register, headerRegisterValue);
  }, REGISTER_INTERVAL_MS);
}

function findEntry(slug: string): CatalogEntry | undefined {
  return entries.find((entry) => entry.slug === slug);
}

function renderNotFound(): HTMLElement {
  const el = document.createElement("div");
  el.className = "not-found";

  const p = document.createElement("p");
  p.textContent = "not found";
  el.appendChild(p);

  const back = document.createElement("a");
  back.className = "back-link";
  back.href = "#/";
  back.textContent = "back to catalog";
  el.appendChild(back);

  return el;
}

function renderBattery(): HTMLElement {
  const el = document.createElement("div");
  el.className = "battery";

  const pre = document.createElement("pre");
  pre.textContent = `crossOriginIsolated: ${crossOriginIsolated}`;
  el.appendChild(pre);

  const line = (text: string): void => {
    pre.textContent += `\n${text}`;
  };

  (async () => {
    try {
      const t0 = performance.now();
      const ctx = await getContext();
      line(`z3 init: ${Math.round(performance.now() - t0)}ms`);
      await runBattery(ctx, (row) => line(`${row.name}: ${Math.round(row.ms)}ms ${row.outcome}`));
      line("battery complete");
    } catch (error) {
      line(`FAILED: ${String(error)}`);
    }
  })();

  return el;
}

function renderContent(hash: string): HTMLElement {
  if (hash === "#/" || hash === "") {
    return renderList(entries);
  }

  if (hash === "#/about") {
    return renderAbout();
  }

  if (hash === "#/scope") {
    return renderScope();
  }

  if (hash === "#/battery") {
    return renderBattery();
  }

  const entryMatch = hash.match(/^#\/e\/(.+)$/);
  if (entryMatch) {
    const entry = findEntry(entryMatch[1]);
    return entry ? renderEntry(entry) : renderNotFound();
  }

  if (hash === "#/play/custom" || hash.startsWith("#/play/custom?")) {
    return renderCustom();
  }

  const playMatch = hash.match(/^#\/play\/(.+)$/);
  if (playMatch) {
    const entry = findEntry(playMatch[1]);
    return entry ? renderPlayground(entry) : renderNotFound();
  }

  return renderNotFound();
}

function route(): void {
  const hash = location.hash || "#/";
  app.innerHTML = "";
  app.appendChild(renderHeader());
  app.appendChild(renderContent(hash));
  app.appendChild(renderFooter());
  if (hash === "#/") startHeroTheater();
}

window.addEventListener("hashchange", route);
route();
startHeaderCounter();
