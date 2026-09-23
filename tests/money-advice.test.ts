import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculate } from "../lib/saju/chart";
import { buildReading, topicOrder } from "../lib/saju/reading";
import { generateReading, validateReading } from "../lib/saju/ai-reading";
import { parseSavedResult } from "../lib/saju/saved-result";
import { parseHistoryItem } from "../lib/saju/history";

const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
const generatedAt = "2026-09-23T09:00:00.000Z";

test("새 Gemini 응답은 금전 분야를 반드시 포함하고 요청 형식에도 필수로 명시한다", async () => {
  const reading = buildReading(chart);
  const { finance: _finance, ...oldAdvice } = reading.advice;
  assert.equal(topicOrder.includes("finance"), true);
  assert.throws(() => validateReading({ ...reading, advice: oldAdvice }), { code: "invalid_response" });
  assert.equal(validateReading(reading).advice.finance.title, "금전");

  let requestBody: Record<string, unknown> | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reading) }] } }] }), { status: 200 });
  };
  const result = await generateReading(chart, "test-only-key", fetcher);
  assert.equal(result.advice.finance.title, "금전");
  const generation = requestBody?.generationConfig as { responseSchema?: { properties?: { advice?: { required?: string[] } } } };
  assert.ok(generation.responseSchema?.properties?.advice?.required?.includes("finance"));
  assert.match(JSON.stringify(requestBody?.contents), /금전/);
});

for (const forbidden of [
  "내년에 확정 수익을 얻습니다.",
  "비트코인을 지금 매수하세요.",
  "대출을 받아 투자하세요.",
  "로또 당첨 시기는 내년입니다.",
]) {
  test(`금전 조언에서 금지 표현을 거부한다: ${forbidden}`, () => {
    const reading = buildReading(chart);
    assert.throws(
      () => validateReading({ ...reading, advice: { ...reading.advice, finance: { ...reading.advice.finance, description: forbidden } } }),
      { code: "invalid_response" },
      `금전 조언에서 거절해야 하는 표현: ${forbidden}`,
    );
  });
}

test("이전 네 분야 결과는 이력에서 열리고 금전 조언이 없다는 안내만 보여준다", () => {
  const reading = buildReading(chart);
  const { finance: _finance, ...oldAdvice } = reading.advice;
  const oldResult = { version: 1, chart, reading: { ...reading, advice: oldAdvice }, generatedAt };
  const parsed = parseSavedResult(JSON.stringify(oldResult));
  assert.ok(parsed, "이전 브라우저 저장 결과를 버리면 안 됩니다");
  assert.match(parsed.reading.advice.finance.description, /이전 결과|추가되기 전/);
  assert.match(parsed.reading.advice.finance.description, /금전 조언이 없/);
  assert.doesNotMatch(parsed.reading.advice.finance.description, /투자|수익|재산이 늘/);

  const history = parseHistoryItem({ id: "old-id", chart, reading: oldResult.reading, created_at: generatedAt });
  assert.ok(history, "이전 데이터베이스 이력을 버리면 안 됩니다");
  assert.match(history.reading.advice.finance.description, /금전 조언이 없/);
});

test("새 결과와 이력 화면은 다섯 분야를 공통 순서로 렌더링한다", () => {
  const source = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
  const form = source("app/saju-form.tsx");
  const history = source("app/history/history-view.tsx");
  assert.match(form, /topicOrder\.map\(\(topic\)\s*=>/);
  assert.match(form, /result\.reading\.advice\[topic\]\.title/);
  assert.match(history, /topicOrder\.map\(\(topic\)\s*=>/);
  assert.match(history, /selected\.reading\.advice\[topic\]\.title/);
});
