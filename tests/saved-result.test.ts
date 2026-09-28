import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import { buildReading } from "../lib/saju/reading";
import {
  STORAGE_KEY,
  clearResult,
  loadResult,
  parseSavedResult,
  saveResult,
  type SavedResult,
} from "../lib/saju/saved-result";

const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
const saved: SavedResult = {
  version: 1,
  chart,
  reading: buildReading(chart),
  generatedAt: "2026-09-23T09:00:00.000Z",
};

test("최근 결과 1건을 저장·복원·삭제한다", () => {
  const data = new Map<string, string>();
  const storage = {
    setItem: (key: string, value: string) => { data.set(key, value); },
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => { data.delete(key); },
  };

  saveResult(storage, saved);
  assert.equal(data.size, 1);
  assert.deepEqual(loadResult(storage), saved);
  assert.doesNotMatch(data.get(STORAGE_KEY) ?? "", /2000-01-01|12:00|GEMINI_API_KEY/);

  clearResult(storage);
  assert.equal(loadResult(storage), null);
});

test("손상되었거나 낡은 저장 자료를 복원하지 않는다", () => {
  assert.equal(parseSavedResult("not-json"), null);
  assert.equal(parseSavedResult(JSON.stringify({ ...saved, version: 2 })), null);
  assert.equal(parseSavedResult(JSON.stringify({ ...saved, chart: { ...chart, pillars: [] } })), null);
  assert.equal(parseSavedResult(JSON.stringify({ ...saved, reading: { ...saved.reading, headline: "" } })), null);
  assert.equal(parseSavedResult(JSON.stringify({ ...saved, generatedAt: "yesterday" })), null);
});

test("새 3기둥 결과와 기존 birthTimeKnown 없는 4기둥 결과를 모두 복원한다", () => {
  const unknownChart = calculate({
    date: "2000-01-01", time: "", unknownTime: true,
    calendar: "solar", topic: "general", question: "",
  });
  const unknownSaved: SavedResult = {
    ...saved,
    chart: unknownChart,
    reading: buildReading(unknownChart),
  };
  assert.deepEqual(parseSavedResult(JSON.stringify(unknownSaved)), unknownSaved);

  const { birthTimeKnown: _omitted, ...legacyChart } = chart;
  const legacySaved = { ...saved, chart: legacyChart };
  const parsedLegacy = parseSavedResult(JSON.stringify(legacySaved));
  assert.ok(parsedLegacy);
  assert.equal(parsedLegacy.chart.pillars.length, 4);
  assert.equal(parsedLegacy.chart.birthTimeKnown, undefined);
});

test("출생시간 반영 여부와 기둥·오행 합계가 모순되는 저장 결과를 거부한다", () => {
  const unknownChart = calculate({
    date: "2000-01-01", time: "", unknownTime: true,
    calendar: "solar", topic: "general", question: "",
  });
  const unknownSaved = { ...saved, chart: unknownChart, reading: buildReading(unknownChart) };

  assert.equal(parseSavedResult(JSON.stringify({
    ...saved, chart: { ...chart, birthTimeKnown: false },
  })), null);
  assert.equal(parseSavedResult(JSON.stringify({
    ...unknownSaved, chart: { ...unknownChart, birthTimeKnown: true },
  })), null);
  assert.equal(parseSavedResult(JSON.stringify({
    ...unknownSaved,
    chart: { ...unknownChart, elements: { ...unknownChart.elements, 목: unknownChart.elements.목 + 2 } },
  })), null);
});

test("브라우저가 저장을 거부하면 성공한 척하지 않고 호출자에게 오류를 전달한다", () => {
  const unavailable = {
    setItem: () => { throw new Error("storage unavailable"); },
  };
  assert.throws(() => saveResult(unavailable, saved), /storage unavailable/);
});
