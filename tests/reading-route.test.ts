import test from "node:test";
import assert from "node:assert/strict";
import { createPost } from "../app/api/reading/route";
import { calculate } from "../lib/saju/chart";
import { buildReading } from "../lib/saju/reading";
import { ReadingError } from "../lib/saju/ai-reading";

const input = { date: "2000-01-01", time: "12:00" };
const requestId = "00000000-0000-4000-8000-000000000001";
const chart = calculate({ ...input, calendar: "solar", topic: "general" });
const reading = buildReading(chart);
const createdAt = "2026-09-23T09:00:00.000Z";
const request = (body: unknown, client: string) => new Request("http://localhost/api/reading", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": client },
  body: JSON.stringify(body),
});

function fakeClient(options: {
  userId?: string | null; existing?: unknown; lookupError?: unknown; insertError?: unknown;
} = {}) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select(columns: string) { calls.push(["select", columns]); return query; },
    eq(column: string, value: unknown) { calls.push([`eq:${column}`, value]); return query; },
    insert(row: unknown) { calls.push(["insert", row]); return query; },
    async maybeSingle() { return { data: options.existing ?? null, error: options.lookupError ?? null }; },
    async single() { return { data: { id: "saved-id", created_at: createdAt }, error: options.insertError ?? null }; },
  };
  const client = {
    auth: { async getUser() { return { data: { user: options.userId === null ? null : { id: options.userId ?? "user-a" } }, error: null }; } },
    from(table: string) { calls.push(["from", table]); return query; },
  };
  return { calls, createClient: (async () => client) as unknown as NonNullable<Parameters<typeof createPost>[0]>["createClient"] };
}

async function withKey(run: () => Promise<void>) {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-secret-key";
  try { await run(); } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
}

test("비로그인 요청은 Gemini와 DB보다 먼저 401", async () => withKey(async () => {
  const db = fakeClient({ userId: null });
  let geminiCalls = 0;
  const post = createPost({ createClient: db.createClient, generateReading: async () => { geminiCalls++; return reading; } });
  const response = await post(request({ ...input, requestId }, "test-unauthorized"));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "unauthorized");
  assert.equal(geminiCalls, 0);
  assert.deepEqual(db.calls, []);
}));

test("입력과 설정 오류는 생성·저장 전에 거부", async () => {
  const db = fakeClient();
  let geminiCalls = 0;
  const post = createPost({ createClient: db.createClient, generateReading: async () => { geminiCalls++; return reading; } });
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const response = await post(request({ ...input, requestId }, "test-no-key"));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "missing_key");
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
  await withKey(async () => {
    const invalid = await post(request({ ...input, requestId, date: "2000-02-30" }, "test-invalid-date"));
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, "invalid_input");
    assert.equal((await post(request(input, "test-missing-id"))).status, 400);
    assert.equal((await post(request({ ...input, requestId, noise: "x".repeat(300) }, "test-oversized"))).status, 413);
  });
  assert.equal(geminiCalls, 0);
  assert.deepEqual(db.calls, []);
});

test("서버 계산값을 사용자 계정에 저장하고 같은 요청 재시도는 중복 생성하지 않는다", async () => withKey(async () => {
  const db = fakeClient({ userId: "user-a" });
  let geminiCalls = 0;
  const post = createPost({ createClient: db.createClient, generateReading: async () => { geminiCalls++; return reading; } });
  const response = await post(request({ ...input, requestId, user_id: "user-b", chart: { fake: true } }, "test-success"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.saved, true);
  assert.equal(body.id, "saved-id");
  assert.deepEqual(body.chart, chart);
  assert.deepEqual(body.reading, reading);
  assert.equal(geminiCalls, 1);
  assert.ok(db.calls.some(([name, value]) => name === "eq:user_id" && value === "user-a"));
  const row = db.calls.find(([name]) => name === "insert")?.[1] as Record<string, unknown>;
  assert.equal(row.user_id, "user-a");
  assert.equal(row.request_id, requestId);
  assert.deepEqual(row.chart, chart);
  assert.doesNotMatch(JSON.stringify(row), /2000-01-01|12:00|test-secret-key|user-b/);

  const existing = fakeClient({ existing: { id: "saved-id", chart, reading, created_at: createdAt } });
  const retry = createPost({ createClient: existing.createClient, generateReading: async () => { throw new Error("should not run"); } });
  const retried = await retry(request({ ...input, requestId }, "test-retry"));
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).id, "saved-id");
  assert.equal(existing.calls.some(([name]) => name === "insert"), false);
}));

test("시간 미상 여부를 서버 계산에 전달하고 원본 날짜·시간 없이 3기둥 결과를 저장한다", async () => withKey(async () => {
  const db = fakeClient({ userId: "user-a" });
  let generatedChart: typeof chart | undefined;
  const post = createPost({
    createClient: db.createClient,
    generateReading: async (received) => {
      generatedChart = received;
      return buildReading(received);
    },
  });
  const response = await post(request({
    date: "2000-01-01", time: "", unknownTime: true, requestId,
  }, "test-unknown-time"));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(generatedChart?.birthTimeKnown, false);
  assert.equal(generatedChart?.pillars.length, 3);
  assert.equal(Object.values(generatedChart!.elements).reduce((sum, count) => sum + count, 0), 6);
  assert.equal(body.chart.birthTimeKnown, false);
  assert.equal(body.chart.pillars.length, 3);

  const row = db.calls.find(([name]) => name === "insert")?.[1] as Record<string, unknown>;
  assert.deepEqual(row.chart, generatedChart);
  assert.doesNotMatch(JSON.stringify(row), /2000-01-01|12:00/);
}));

test("DB 조회 실패는 생성 중단, 저장 실패는 미저장 표시", async () => withKey(async () => {
  const unavailable = fakeClient({ lookupError: new Error("db offline") });
  const noGeneration = createPost({ createClient: unavailable.createClient, generateReading: async () => { throw new Error("should not run"); } });
  const failedLookup = await noGeneration(request({ ...input, requestId }, "test-db-lookup"));
  assert.equal(failedLookup.status, 503);
  assert.equal((await failedLookup.json()).code, "database_unavailable");

  const failedInsert = fakeClient({ insertError: new Error("db offline") });
  const post = createPost({ createClient: failedInsert.createClient, generateReading: async () => reading });
  const response = await post(request({ ...input, requestId }, "test-db-insert"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.saved, false);
  assert.match(body.error, /저장하지 못했습니다/);
}));

test("Gemini 실패와 요청 과다는 저장 행을 만들지 않는다", async () => withKey(async () => {
  const db = fakeClient();
  const post = createPost({ createClient: db.createClient, generateReading: async () => { throw new ReadingError("quota", "한도 초과"); } });
  const quota = await post(request({ ...input, requestId }, "test-gemini-quota"));
  assert.equal(quota.status, 429);
  assert.equal((await quota.json()).code, "quota");
  assert.equal(db.calls.some(([name]) => name === "insert"), false);
  for (let index = 0; index < 6; index++) {
    assert.equal((await post(request({ ...input, requestId, date: "invalid" }, "test-rate-limit"))).status, 400);
  }
  const limited = await post(request({ ...input, requestId }, "test-rate-limit"));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, "quota");
}));
