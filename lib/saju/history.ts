import { parseSavedResult, type SavedResult } from "./saved-result";

export type HistoryItem = SavedResult & {
  id: string | null;
  saved: boolean;
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parseHistoryItem(value: unknown): HistoryItem | null {
  const item = object(value);
  if (!item) return null;
  const saved = item.saved === undefined ? true : item.saved === true;
  if (item.saved !== undefined && typeof item.saved !== "boolean") return null;
  if (saved && typeof item.id !== "string") return null;
  const generatedAt = item.created_at ?? item.generatedAt;
  const result = parseSavedResult(JSON.stringify({
    version: 1, chart: item.chart, reading: item.reading, generatedAt,
  }));
  return result ? { ...result, id: saved ? item.id as string : null, saved } : null;
}
