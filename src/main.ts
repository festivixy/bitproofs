import "./style.css";
import { CatalogEntry, loadCatalog } from "./catalog";
import {
  renderAbout,
  renderEntry,
  renderFooter,
  renderHeader,
  renderList,
  renderPlaygroundStub,
  renderScope,
} from "./pages";
import { getContext } from "./z3";
import { runBattery } from "./battery";

const app = document.getElementById("app")!;
const entries = loadCatalog();

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

  const playMatch = hash.match(/^#\/play\/(.+)$/);
  if (playMatch) {
    const entry = findEntry(playMatch[1]);
    return entry ? renderPlaygroundStub(entry) : renderNotFound();
  }

  return renderNotFound();
}

function route(): void {
  app.innerHTML = "";
  app.appendChild(renderHeader());
  app.appendChild(renderContent(location.hash || "#/"));
  app.appendChild(renderFooter());
}

window.addEventListener("hashchange", route);
route();
