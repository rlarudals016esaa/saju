import type { SajuChart } from "./chart";
import { validateReading } from "./ai-reading";
import type { SajuReading } from "./reading";

export const STORAGE_KEY = "saju:last-result:v1";

export type SavedResult = {
  version: 1;
  chart: SajuChart;
  reading: SajuReading;
  generatedAt: string;
};

const elements = ["목", "화", "토", "금", "수"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 200;
}

function validChart(value: unknown): value is SajuChart {
  if (!isRecord(value) || !Array.isArray(value.pillars) || value.pillars.length !== 4) return false;
  if (!value.pillars.every((item: unknown) =>
    isRecord(item) && ["label", "text", "korean", "stem", "branch", "stemElement", "branchElement"]
      .every((field) => nonempty(item[field])))) return false;
  if (!isRecord(value.dayMaster) || !["character", "korean", "element"].every((field) => nonempty((value.dayMaster as Record<string, unknown>)[field]))) return false;
  if (!elements.includes(value.dayMaster.element as typeof elements[number])) return false;
  const counts = value.elements;
  if (!isRecord(counts) || !elements.every((element) =>
    Number.isInteger(counts[element]) && (counts[element] as number) >= 0 && (counts[element] as number) <= 8)) return false;
  if (elements.reduce((sum, element) => sum + (counts[element] as number), 0) !== 8) return false;
  return nonempty(value.method) && nonempty(value.engine) && nonempty(value.elementMethod);
}

export function parseSavedResult(raw: string): SavedResult | null {
  if (raw.length > 16000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !validChart(value.chart)) return null;
    if (typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt))) return null;
    return {
      version: 1,
      chart: value.chart,
      reading: validateReading(value.reading, { allowLegacyFinance: true }),
      generatedAt: value.generatedAt,
    };
  } catch {
    return null;
  }
}

export function saveResult(storage: Pick<Storage, "setItem">, result: SavedResult): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function loadResult(storage: Pick<Storage, "getItem">): SavedResult | null {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? parseSavedResult(raw) : null;
}

export function clearResult(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(STORAGE_KEY);
}
