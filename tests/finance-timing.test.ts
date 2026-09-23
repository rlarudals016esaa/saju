import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculate, type SajuChart } from "../lib/saju/chart";
import { buildFinanceTiming } from "../lib/saju/flow";
import type { ElementName } from "../lib/saju/elements";
import { buildReading } from "../lib/saju/reading";
import { parseHistoryItem } from "../lib/saju/history";

const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
const in2026 = new Date("2025-12-31T15:30:00Z");

function withDayElement(element: ElementName): SajuChart {
  return { ...chart, dayMaster: { ...chart.dayMaster, element } };
}

test("일간이 극하는 재성 오행과 첫 해당 연도 및 연속 연도를 모든 오행에 매핑한다", () => {
  const cases: [ElementName, ElementName, number[]][] = [
    ["목", "토", [2028, 2029]],
    ["화", "금", [2030, 2031]],
    ["토", "수", [2032, 2033]],
    ["금", "목", [2034, 2035]],
    ["수", "화", [2026, 2027]],
  ];
  for (const [dayElement, wealthElement, years] of cases) {
    const timing = buildFinanceTiming(withDayElement(dayElement), in2026);
    assert.equal(timing.dayElement, dayElement);
    assert.equal(timing.wealthElement, wealthElement);
    assert.deepEqual(timing.years, years, `${dayElement} 일간의 첫 재성 연도`);
  }
});

test("연도 경계는 UTC가 아닌 한국 날짜의 올해를 사용한다", () => {
  const beforeKoreanNewYear = buildFinanceTiming(withDayElement("금"), new Date("2025-12-31T14:59:59Z"));
  const afterKoreanNewYear = buildFinanceTiming(withDayElement("금"), new Date("2025-12-31T15:00:00Z"));
  assert.deepEqual(beforeKoreanNewYear.years, [2025]);
  assert.deepEqual(afterKoreanNewYear.years, [2034, 2035]);
});

test("표시 연도는 올해부터 9년 이내이며 월일·금액·확률 같은 가짜 예측값을 만들지 않는다", () => {
  for (const dayElement of ["목", "화", "토", "금", "수"] as const) {
    const timing = buildFinanceTiming(withDayElement(dayElement), in2026);
    assert.ok(timing.years.length >= 1 && timing.years.length <= 2);
    assert.ok(timing.years.every((year) => Number.isInteger(year) && year >= 2026 && year <= 2035));
    assert.deepEqual(Object.keys(timing).sort(), ["dayElement", "wealthElement", "years"]);
  }
});

test("예전 네 분야 이력도 현재 기준 금전 시기를 계산할 사주를 유지한다", () => {
  const reading = buildReading(chart);
  const { finance: _finance, ...oldAdvice } = reading.advice;
  const history = parseHistoryItem({
    id: "old-result",
    chart,
    reading: { ...reading, advice: oldAdvice },
    created_at: "2023-06-15T12:00:00.000Z",
  });
  assert.ok(history);
  assert.match(history.reading.advice.finance.description, /금전 조언이 없/);
  assert.deepEqual(buildFinanceTiming(history.chart, in2026), buildFinanceTiming(chart, in2026));
});

test("금전 시기 컴포넌트는 새 결과와 이력의 금전 조언에서만 행동 상자 전에 표시한다", () => {
  const source = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
  const form = source("app/saju-form.tsx");
  const history = source("app/history/history-view.tsx");
  for (const [name, view, condition] of [
    ["새 결과", form, /selectedTopic\s*===\s*["']finance["']\s*&&\s*<FinanceTiming\b/],
    ["이력", history, /topic\s*===\s*["']finance["']\s*&&\s*<FinanceTiming\b/],
  ] as const) {
    assert.match(view, condition, `${name}: 금전 이외 분야에서는 표시하지 않아야 합니다`);
    assert.ok(view.indexOf("<FinanceTiming") < view.indexOf('className="action-box"'), `${name}: 시기는 행동 상자보다 앞에 있어야 합니다`);
  }
  const component = source("app/finance-timing.tsx");
  assert.match(component, /사주에서 금전 기회로 읽는 시기/);
  assert.match(component, /재성|일간|오행/);
  assert.match(component, /소득|지출|환경|선택/);
  assert.doesNotMatch(component, /확정 수익|반드시 돈이 들어|투자 성공|가난 운명|부자 운명/);
});
