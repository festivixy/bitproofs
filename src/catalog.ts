import { Program, parseProgram } from "./ir";
import catalogJson from "../catalog.json";

export interface ExampleRow {
  inputs: number[];
  output: number;
}

export interface CatalogEntry {
  slug: string;
  title: string;
  description: string;
  category: string;
  arity: number;
  tier: string;
  floor_note: string;
  compilers: Record<string, number | null>;
  godbolt: Record<string, string>;
  cost_note: string;
  spec: Program | null;
  program: Program | null;
  spec_8bit: Program | null;
  program_8bit: Program | null;
  example_8bit: ExampleRow[];
  width: number;
}

const REQUIRED_KEYS: (keyof CatalogEntry)[] = [
  "slug", "title", "description", "category", "arity", "tier",
  "floor_note", "compilers", "godbolt", "cost_note", "spec", "program",
  "spec_8bit", "program_8bit", "example_8bit", "width",
];

const PROGRAM_FIELDS = ["spec", "program", "spec_8bit", "program_8bit"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("expected a catalog object");
  }
  return value as Record<string, unknown>;
}

function validateEntry(value: unknown): CatalogEntry {
  const raw = asRecord(value);
  for (const key of REQUIRED_KEYS) {
    if (!(key in raw)) throw new Error(`catalog entry missing key: ${String(key)}`);
  }
  for (const field of PROGRAM_FIELDS) {
    if (raw[field] !== null) parseProgram(raw[field]);
  }
  return raw as unknown as CatalogEntry;
}

export function loadCatalog(): CatalogEntry[] {
  const data = asRecord(catalogJson);
  const entries = data.entries;
  if (!Array.isArray(entries) || entries.length !== 25) {
    throw new Error(
      `expected 25 catalog entries, got ${Array.isArray(entries) ? entries.length : typeof entries}`,
    );
  }
  return entries.map(validateEntry);
}
