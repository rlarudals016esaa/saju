import test from "node:test";
import assert from "node:assert/strict";
import { createGet, createPost } from "../app/api/daily-fortunes/route";

const fortune = {
  headline: "오늘의 기준을 살펴보세요", overall: "전체 흐름을 차분히 확인해 보세요.",
  workStudy: "작은 일부터 시작해 보세요.", finance: "지출 계획을 확인해 보세요.",
  relationships: "대화를 천천히 이어가 보세요.", action: "할 일 하나를 적어보세요.",
};

function userClient(userId: string | null, rows: unknown[] = []) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select(value: string) { calls.push(["select", value]); return query; },
    eq(column: string, value: unknown) { calls.push([`eq:${column}`, value]); return query; },
    gte(column: string, value: unknown) { calls.push([`gte:${column}`, value]); return query; },
    async order(column: string, options: unknown) {
      calls.push([`order:${column}`, options]);
      return { data: rows, error: null };
    },
  };
  const client = {
    auth: { async getUser() { return { data: { user: userId ? { id: userId } : null }, error: null }; } },
    from(table: string) { calls.push(["from", table]); return query; },
  };
  return { calls, factory: (async () => client) as never };
}

async function withKey(run: () => Promise<void>) {
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  try { await run(); } finally {
    if (old === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = old;
  }
}

test("운세 조회와 누락 생성은 로그인 전에 DB 또는 관리자 권한을 사용하지 않는다", async () => withKey(async () => {
  const db = userClient(null);
  let adminCalls = 0;
  let generationCalls = 0;
  const now = () => new Date("2026-09-28T21:10:00.000Z");
  const getResponse = await createGet({ createClient: db.factory, now })();
  const postResponse = await createPost({
    createClient: db.factory,
    createAdminClient: (() => { adminCalls++; return {}; }) as never,
    generateForUser: (async () => { generationCalls++; return { outcome: "created", fortune }; }) as never,
    now,
  })();
  assert.equal(getResponse.status, 401);
  assert.equal(postResponse.status, 401);
  assert.deepEqual(db.calls, []);
  assert.equal(adminCalls, 0);
  assert.equal(generationCalls, 0);
}));

test("로그인 사용자는 한국 오늘부터 최근 30일 완료 운세만 최신순 조회한다", async () => {
  const rows = [{ id: "fortune-a", fortune_date: "2026-09-29", fortune, created_at: "2026-09-28T21:10:00Z" }];
  const db = userClient("user-a", rows);
  const response = await createGet({
    createClient: db.factory,
    now: () => new Date("2026-09-28T21:10:00.000Z"),
  })();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { today: "2026-09-29", items: rows });
  assert.ok(db.calls.some(([name, value]) => name === "eq:user_id" && value === "user-a"));
  assert.ok(db.calls.some(([name, value]) => name === "eq:status" && value === "completed"));
  assert.ok(db.calls.some(([name, value]) => name === "gte:fortune_date" && value === "2026-08-31"));
  assert.ok(db.calls.some(([name, value]) => name === "order:fortune_date" && (value as { ascending?: boolean }).ascending === false));
});

test("오늘 운세가 없을 때 로그인 사용자 한 명만 생성하고 사주 없음은 안내한다", async () => withKey(async () => {
  const db = userClient("user-a");
  const requests: unknown[] = [];
  const now = () => new Date("2026-09-28T21:10:00.000Z");
  const created = await createPost({
    createClient: db.factory,
    createAdminClient: (() => ({ role: "service" })) as never,
    generateForUser: (async (options: unknown) => { requests.push(options); return { outcome: "created", fortune }; }) as never,
    now,
  })();
  assert.equal(created.status, 200);
  assert.equal((await created.json()).outcome, "created");
  const request = requests[0] as { userId: string; fortuneDate: string; apiKey: string };
  assert.equal(request.userId, "user-a");
  assert.equal(request.fortuneDate, "2026-09-29");
  assert.equal(request.apiKey, "test-key");

  const noReading = await createPost({
    createClient: db.factory,
    createAdminClient: (() => ({})) as never,
    generateForUser: (async () => ({ outcome: "no_reading" })) as never,
    now,
  })();
  assert.equal(noReading.status, 409);
  assert.equal((await noReading.json()).code, "no_reading");
}));
