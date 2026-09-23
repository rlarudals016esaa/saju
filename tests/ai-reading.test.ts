import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import { generateReading, validateReading } from "../lib/saju/ai-reading";

const completeReading = {
  headline: "차분한 관찰력을 오늘의 선택에 활용해 보세요",
  tendency: "생각을 깊이 살피는 경향이 있을 수 있습니다. 실제 경험과 함께 돌아보세요.",
  strength: "다양한 관점을 듣고 정리하는 힘을 살펴보세요.",
  caution: "준비에 시간을 쓰는 동안 작은 시도를 미루지는 않는지 점검해 보세요.",
  advice: {
    career: { title: "취업", description: "관심 직무를 탐색하며 경험을 확인해 보세요.", action: "관심 공고 하나를 읽고 필요한 역량을 적어보세요." },
    finance: { title: "금전", description: "요즘 돈을 쓰는 기준을 돌아보세요.", action: "지난주 지출 중 계획 밖 항목을 적어보세요." },
    love: { title: "연애", description: "내 마음을 전할 시기를 함께 생각해 보세요.", action: "전하고 싶은 마음을 짧게 적어보세요." },
    relationships: { title: "인간관계", description: "상대의 의견을 듣는 것과 내 뜻을 말하는 것의 균형을 살펴보세요.", action: "다음 대화에서 내 생각 한 문장을 전해보세요." },
    life: { title: "삶의 흐름", description: "변화를 작은 실험으로 시작해 볼 수 있습니다.", action: "이번 주 시도할 일 한 가지를 정해보세요." },
  },
};

test("AI 해석은 금전을 포함한 다섯 분야와 필수 문장이 모두 있을 때만 허용한다", () => {
  assert.deepEqual(validateReading(completeReading), completeReading);
  assert.throws(() => validateReading({ ...completeReading, strength: "   " }));
  assert.throws(() => validateReading({ ...completeReading, advice: { ...completeReading.advice, finance: undefined } }));
  assert.throws(() => validateReading({ ...completeReading, advice: { ...completeReading.advice, love: undefined } }));
  assert.throws(() => validateReading({ ...completeReading, advice: { ...completeReading.advice, life: { ...completeReading.advice.life, action: "" } } }));
});

test("AI 해석의 확정적 단정 표현을 거부한다", () => {
  assert.throws(() => validateReading({ ...completeReading, headline: "반드시 합격한다" }));
  assert.throws(() => validateReading({ ...completeReading, headline: "가".repeat(81) }));
});

test("Gemini 요청은 지정 모델과 계산값을 사용하고 완전한 해석을 돌려준다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
  let url = "";
  let requestBody = "";
  let keyHeader = "";
  const fetcher: typeof fetch = async (input, init) => {
    url = String(input);
    requestBody = String(init?.body);
    keyHeader = new Headers(init?.headers).get("x-goog-api-key") ?? "";
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(completeReading) }] } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const reading = await generateReading(chart, "test-secret-key", fetcher);
  assert.deepEqual(reading, completeReading);
  assert.match(url, /gemini-3\.5-flash-lite/);
  assert.equal(keyHeader, "test-secret-key");
  assert.doesNotMatch(url, /test-secret-key/);
  assert.doesNotMatch(requestBody, /2000-01-01|12:00|test-secret-key/);
  assert.match(requestBody, new RegExp(chart.dayMaster.character));
});

test("Gemini 실패와 불완전한 응답은 성공 결과로 바꾸지 않는다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
  const failed: typeof fetch = async () => new Response("{}", { status: 429 });
  const malformed: typeof fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
  await assert.rejects(generateReading(chart, "test-secret-key", failed));
  await assert.rejects(generateReading(chart, "test-secret-key", malformed));
});

test("시간 초과와 연결 오류를 구분한다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general", question: "" });
  const timedOut: typeof fetch = async () => { throw new DOMException("timeout", "TimeoutError"); };
  const disconnected: typeof fetch = async () => { throw new Error("offline"); };
  await assert.rejects(generateReading(chart, "test-secret-key", timedOut), { code: "timeout" });
  await assert.rejects(generateReading(chart, "test-secret-key", disconnected), { code: "network" });
});
