import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import {
  buildDailyTransit,
  generateDailyFortune,
  koreanDate,
  shiftDate,
  validateDailyFortune,
} from "../lib/saju/daily-fortune";

const completeFortune = {
  headline: "차분히 오늘의 우선순위를 살펴보세요",
  overall: "서두르기보다 이미 정한 기준을 한 번 더 확인해 볼 수 있는 날입니다.",
  workStudy: "할 일을 작은 단위로 나누고 첫 단계부터 시작해 보세요.",
  finance: "오늘의 지출 계획을 적고 계획 밖 소비가 있는지 살펴보세요.",
  relationships: "상대의 말을 들은 뒤 내 생각도 짧고 분명하게 전해 보세요.",
  action: "오전에 가장 중요한 일 한 가지를 적어보세요.",
};

test("한국 날짜는 UTC가 아닌 Asia/Seoul 자정 경계로 정한다", () => {
  assert.equal(koreanDate(new Date("2026-09-28T14:59:59.000Z")), "2026-09-28");
  assert.equal(koreanDate(new Date("2026-09-28T15:00:00.000Z")), "2026-09-29");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
});

test("오늘 간지는 같은 한국 날짜에 대해 결정적이고 날짜가 결과에 포함된다", () => {
  const first = buildDailyTransit("2026-09-29");
  const second = buildDailyTransit("2026-09-29");
  assert.deepEqual(first, second);
  assert.equal(first.date, "2026-09-29");
  assert.match(first.dayPillar.text, /^.{2}$/u);
  assert.match(first.dayPillar.korean, /^.{2}$/u);
  assert.ok(["목", "화", "토", "금", "수"].includes(first.dayPillar.stemElement));
  assert.ok(["목", "화", "토", "금", "수"].includes(first.dayPillar.branchElement));
});

test("운세 응답은 여섯 필수 항목과 길이를 검증한다", () => {
  assert.deepEqual(validateDailyFortune(completeFortune), completeFortune);
  assert.throws(() => validateDailyFortune({ ...completeFortune, overall: " " }));
  assert.throws(() => validateDailyFortune({ ...completeFortune, workStudy: undefined }));
  assert.throws(() => validateDailyFortune({ ...completeFortune, action: "가".repeat(201) }));
});

test("확정적 미래 예측과 투자·수익·대출 권유를 거절한다", () => {
  for (const unsafe of [
    "반드시 합격한다",
    "확정 수익을 얻습니다",
    "비트코인을 매수하세요",
    "대출을 받아 투자하세요",
  ]) {
    assert.throws(() => validateDailyFortune({ ...completeFortune, finance: unsafe }), unsafe);
  }
});

test("Gemini 프롬프트는 앱 계산값만 전달하고 원본 생년월일을 노출하지 않는다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
  let url = "";
  let requestBody = "";
  let keyHeader = "";
  const fetcher: typeof fetch = async (input, init) => {
    url = String(input);
    requestBody = String(init?.body);
    keyHeader = new Headers(init?.headers).get("x-goog-api-key") || "";
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(completeFortune) }] } }],
    }), { status: 200 });
  };

  assert.deepEqual(await generateDailyFortune(chart, "2026-09-29", "secret-key", fetcher), completeFortune);
  const prompt = JSON.parse(requestBody).contents[0].parts[0].text as string;
  assert.match(url, /gemini-3\.5-flash-lite/);
  assert.equal(keyHeader, "secret-key");
  assert.doesNotMatch(url + requestBody, /secret-key|2000-01-01|12:00/);
  assert.match(prompt, /다시 계산하거나 생년월일을 추측하지 마세요/);
  assert.match(prompt, /"date":"2026-09-29"/);
  assert.match(prompt, new RegExp(chart.dayMaster.character));
  assert.match(prompt, /특정 투자상품, 매매, 대출을 권하지 마세요/);
  assert.match(prompt, /질병, 법률, 재산, 수익, 합격, 결혼, 이별/);
});

test("Gemini 실패와 손상된 응답을 운세로 꾸미지 않는다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "", unknownTime: true, calendar: "solar", topic: "general" });
  const quota: typeof fetch = async () => new Response("{}", { status: 429 });
  const malformed: typeof fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "{}" }] } }],
  }), { status: 200 });
  await assert.rejects(generateDailyFortune(chart, "2026-09-29", "key", quota), { code: "quota" });
  await assert.rejects(generateDailyFortune(chart, "2026-09-29", "key", malformed), { code: "invalid_response" });
});
