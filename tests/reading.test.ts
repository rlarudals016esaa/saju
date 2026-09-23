import test from "node:test";
import assert from "node:assert/strict";
import { calculate, type SajuChart, type SajuInput } from "../lib/saju/chart";
import { buildReading, topicOrder } from "../lib/saju/reading";

const base: SajuInput = {
  date: "2000-01-01",
  time: "12:00",
  calendar: "solar",
  topic: "general",
  question: "",
};

test("다섯 오행 모두 첫 화면 요약과 다섯 분야의 조언을 제공한다", () => {
  const seen = new Set<string>();
  const expectedTopics = ["career", "finance", "love", "relationships", "life"];
  const expectedTitles = ["취업", "금전", "연애", "인간관계", "삶의 흐름"];

  assert.deepEqual(topicOrder, expectedTopics);

  for (let day = 1; day <= 10; day++) {
    const chart = calculate({ ...base, date: `2000-01-${String(day).padStart(2, "0")}` });
    const element = chart.dayMaster.element;
    const reading = buildReading(chart);
    seen.add(element);

    for (const field of ["headline", "tendency", "strength", "caution"] as const) {
      assert.ok(reading[field].trim(), `${element}: ${field} 문구가 비어 있습니다`);
    }
    assert.deepEqual(Object.keys(reading.advice), expectedTopics);
    assert.deepEqual(topicOrder.map((topic) => reading.advice[topic].title), expectedTitles);

    for (const topic of topicOrder) {
      const advice = reading.advice[topic];
      assert.ok(advice.description.trim(), `${element}: ${topic} 설명이 비어 있습니다`);
      assert.ok(advice.action.trim(), `${element}: ${topic} 실행 제안이 비어 있습니다`);
    }
  }

  assert.deepEqual([...seen].sort(), ["금", "목", "수", "토", "화"].sort());
});

test("같은 출생 정보의 결과는 반복 계산해도 동일하다", () => {
  const first = buildReading(calculate(base));
  const second = buildReading(calculate({ ...base }));
  assert.deepEqual(second, first);
});

test("지원하지 않는 오행에는 문구 누락을 명확히 알린다", () => {
  const chart = calculate(base);
  const invalidChart: SajuChart = {
    ...chart,
    dayMaster: { ...chart.dayMaster, element: "없는 오행" },
  };
  assert.throws(() => buildReading(invalidChart), /해석 문구를 찾지 못했습니다/);
});
