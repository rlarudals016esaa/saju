import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import { buildDailyTransit, calculateDailyFortune, koreanDate } from "../lib/saju/daily-fortune";

test("한국 날짜는 UTC가 아닌 Asia/Seoul 자정 경계로 정한다", () => {
  assert.equal(koreanDate(new Date("2026-09-28T14:59:59.000Z")), "2026-09-28");
  assert.equal(koreanDate(new Date("2026-09-28T15:00:00.000Z")), "2026-09-29");
});

test("오늘 간지는 같은 한국 날짜에 대해 결정적이다", () => {
  const first = buildDailyTransit("2026-09-29");
  assert.deepEqual(first, buildDailyTransit("2026-09-29"));
  assert.equal(first.date, "2026-09-29");
  assert.match(first.dayPillar.text, /^.{2}$/u);
  assert.match(first.dayPillar.korean, /^.{2}$/u);
  assert.ok(["목", "화", "토", "금", "수"].includes(first.dayPillar.stemElement));
  assert.ok(["목", "화", "토", "금", "수"].includes(first.dayPillar.branchElement));
});

test("같은 저장 사주와 같은 날짜는 외부 호출 없이 항상 같은 운세를 만든다", () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
  const first = calculateDailyFortune(chart, "2026-09-29");
  assert.deepEqual(first, calculateDailyFortune(chart, "2026-09-29"));
  assert.deepEqual(Object.keys(first), [
    "headline", "overall", "workStudy", "finance", "relationships", "action",
  ]);
  for (const value of Object.values(first)) assert.ok(value.trim().length > 0);
  assert.match(first.headline, new RegExp(`^${buildDailyTransit("2026-09-29").dayPillar.korean}일`));
});

test("다른 날짜는 오늘 간지에 맞춰 다른 운세를 만든다", () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
  const dateA = "2026-09-29";
  let dateB = "2026-09-30";
  while (buildDailyTransit(dateA).dayPillar.stemElement === buildDailyTransit(dateB).dayPillar.stemElement) {
    const next = new Date(`${dateB}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dateB = next.toISOString().slice(0, 10);
  }
  assert.notDeepEqual(calculateDailyFortune(chart, dateA), calculateDailyFortune(chart, dateB));
});

test("다른 저장 사주 계산값은 일간 또는 오행 분포에 맞춰 다른 운세를 만든다", () => {
  const first = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
  const second = calculate({ date: "1993-07-18", time: "08:30", calendar: "solar", topic: "general" });
  const firstFortune = calculateDailyFortune(first, "2026-09-29");
  const secondFortune = calculateDailyFortune(second, "2026-09-29");

  if (first.dayMaster.element !== second.dayMaster.element) {
    assert.notEqual(firstFortune.overall, secondFortune.overall);
  } else {
    assert.notEqual(firstFortune.action, secondFortune.action);
  }
});

test("손상된 저장 사주 계산값은 임의 운세로 바꾸지 않고 거절한다", () => {
  const chart = calculate({ date: "2000-01-01", time: "", unknownTime: true, calendar: "solar", topic: "general" });
  const missingDayMaster = { ...chart, dayMaster: { ...chart.dayMaster, element: "바람" } };
  const invalidElements = { ...chart, elements: { ...chart.elements, 목: 1.5 } };
  assert.throws(() => calculateDailyFortune(missingDayMaster as never, "2026-09-29"), /저장된 사주 계산값/);
  assert.throws(() => calculateDailyFortune(invalidElements as never, "2026-09-29"), /저장된 사주 계산값/);
});
