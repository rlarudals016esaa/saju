import type { SajuChart } from "./chart";

export type ElementName = keyof SajuChart["elements"];
export type ElementLevel = "적은 편" | "보통" | "많은 편";

export type ElementEntry = {
  name: ElementName;
  count: number;
  level: ElementLevel;
};

export type ElementProfile = {
  entries: ElementEntry[];
  scale: number;
  low: ElementName[];
  high: ElementName[];
};

export const elementOrder: ElementName[] = ["목", "화", "토", "금", "수"];

export function buildElementProfile(chart: SajuChart): ElementProfile {
  const entries = elementOrder.map((name) => {
    const count = chart.elements[name];
    const level: ElementLevel =
      count <= 1 ? "적은 편" : count >= 3 ? "많은 편" : "보통";
    return { name, count, level };
  });

  return {
    entries,
    scale: Math.max(4, ...entries.map((entry) => entry.count)),
    low: entries.filter((entry) => entry.level === "적은 편").map((entry) => entry.name),
    high: entries.filter((entry) => entry.level === "많은 편").map((entry) => entry.name),
  };
}
