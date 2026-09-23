import test from "node:test";
import assert from "node:assert/strict";
import { calculate, type SajuInput } from "../lib/saju/chart";
import { buildElementProfile, elementOrder } from "../lib/saju/elements";

const base: SajuInput = {
  date: "2000-01-01",
  time: "12:00",
  calendar: "solar",
  topic: "general",
};

test("실제 사주 네 기둥의 여덟 글자를 목·화·토·금·수 순서로 표시한다", () => {
  const chart = calculate(base);
  const profile = buildElementProfile(chart);

  assert.deepEqual(elementOrder, ["목", "화", "토", "금", "수"]);
  assert.deepEqual(profile.entries.map(({ name }) => name), elementOrder);
  assert.deepEqual(profile.entries.map(({ count }) => count), [1, 3, 3, 0, 1]);
  assert.equal(profile.entries.reduce((sum, { count }) => sum + count, 0), 8);
  assert.equal(chart.pillars.length, 4);
  for (const entry of profile.entries) {
    const countFromPillars = chart.pillars.flatMap((pillar) => [pillar.stemElement, pillar.branchElement])
      .filter((element) => element === entry.name).length;
    assert.equal(entry.count, countFromPillars, `${entry.name}의 화면 개수와 원래 여덟 글자의 개수가 다릅니다`);
  }
});

test("0~1개는 적은 편, 2개는 보통, 3개 이상은 많은 편으로 구분한다", () => {
  const zeroOneThree = buildElementProfile(calculate(base));
  assert.deepEqual(zeroOneThree.entries.map(({ level }) => level), [
    "적은 편", "많은 편", "많은 편", "적은 편", "적은 편",
  ]);
  assert.deepEqual(zeroOneThree.low, ["목", "금", "수"]);
  assert.deepEqual(zeroOneThree.high, ["화", "토"]);

  const twoFour = buildElementProfile(calculate({ ...base, date: "2000-01-10" }));
  assert.deepEqual(twoFour.entries.map(({ count, level }) => [count, level]), [
    [2, "보통"], [4, "많은 편"], [2, "보통"], [0, "적은 편"], [0, "적은 편"],
  ]);
});

test("그래프 눈금은 기본 4이며 5개 이상인 값도 잘리지 않는다", () => {
  const ordinary = buildElementProfile(calculate(base));
  assert.equal(ordinary.scale, 4);
  assert.ok(ordinary.entries.every(({ count }) => count <= ordinary.scale));

  const concentrated = buildElementProfile(calculate({ ...base, date: "1990-01-22" }));
  assert.deepEqual(concentrated.entries.map(({ count }) => count), [0, 5, 2, 0, 1]);
  assert.equal(concentrated.scale, 5);
  assert.equal(concentrated.entries.reduce((sum, { count }) => sum + count, 0), 8);
  assert.deepEqual(concentrated.high, ["화"]);
});
