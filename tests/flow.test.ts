import test from "node:test";
import assert from "node:assert/strict";
import { calculate, type SajuChart, type SajuInput } from "../lib/saju/chart";
import { buildAnnualFlow, buildRelationGuide } from "../lib/saju/flow";
import type { ElementName } from "../lib/saju/elements";

const base: SajuInput = {
  date: "2000-01-01",
  time: "12:00",
  calendar: "solar",
  topic: "general",
};
const chart = calculate(base);

function withDayElement(element: ElementName): SajuChart {
  return { ...chart, dayMaster: { ...chart.dayMaster, element } };
}

test("한국 시간으로 정한 지난해·올해·내년의 연도와 대표 연주를 표시한다", () => {
  // UTC에서는 2025년이지만 서울에서는 2026년인 시각을 고정한다.
  const flow = buildAnnualFlow(chart, new Date("2025-12-31T15:30:00Z"));

  assert.deepEqual(flow.map(({ year, label, pillar, element }) => ({ year, label, pillar, element })), [
    { year: 2025, label: "지난해", pillar: "을사", element: "목" },
    { year: 2026, label: "올해", pillar: "병오", element: "화" },
    { year: 2027, label: "내년", pillar: "정미", element: "화" },
  ]);
  assert.equal(flow.length, 3);
  assert.ok(flow.every(({ theme, description }) => theme.length > 0 && description.length > 0));
});

test("같은 오행·상생의 두 방향·상극의 두 방향을 서로 다른 관계 주제로 분류한다", () => {
  // 2026년 병오의 천간 오행은 화다.
  const expected: [ElementName, string][] = [
    ["화", "자기 점검"],
    ["토", "배움과 도움"],
    ["목", "표현과 실행"],
    ["수", "선택과 정리"],
    ["금", "기준과 조율"],
  ];
  for (const [element, theme] of expected) {
    const current = buildAnnualFlow(withDayElement(element), new Date("2026-06-15T03:00:00Z"))[1];
    assert.equal(current.element, "화");
    assert.equal(current.theme, theme, `${element} 일간과 화 연주의 분류`);
  }
});

test("목·화·토·금·수의 상생·상극 관계와 해당 천간 예시를 매핑한다", () => {
  const expected: [ElementName, ElementName, string, ElementName, string][] = [
    ["목", "수", "임·계", "금", "경·신"],
    ["화", "목", "갑·을", "수", "임·계"],
    ["토", "화", "병·정", "목", "갑·을"],
    ["금", "토", "무·기", "화", "병·정"],
    ["수", "금", "경·신", "토", "무·기"],
  ];
  for (const [self, supportElement, supportStems, tensionElement, tensionStems] of expected) {
    const relation = buildRelationGuide(withDayElement(self));
    assert.equal(relation.support.element, supportElement, `${self} 일간의 상생 오행`);
    assert.equal(relation.support.stems, supportStems, `${self} 일간의 상생 천간`);
    assert.equal(relation.tension.element, tensionElement, `${self} 일간의 상극 오행`);
    assert.equal(relation.tension.stems, tensionStems, `${self} 일간의 상극 천간`);
    assert.match(relation.support.description, /상생 관계/);
    assert.match(relation.tension.description, /상극 관계/);
  }
});
