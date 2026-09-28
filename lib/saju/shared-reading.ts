import { parseSavedResult, type SavedResult } from "./saved-result";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SharedReading = Omit<SavedResult, "version">;

export function parseSharedReading(value: unknown): SharedReading | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const parsed = parseSavedResult(JSON.stringify({
    version: 1,
    chart: row.chart,
    reading: row.reading,
    generatedAt: row.generated_at ?? row.generatedAt,
  }));
  return parsed ? {
    chart: parsed.chart,
    reading: parsed.reading,
    generatedAt: parsed.generatedAt,
  } : null;
}
