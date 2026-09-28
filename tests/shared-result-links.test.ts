import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPost } from "../app/api/readings/[id]/share/route";
import { createGet } from "../app/api/shared-readings/[token]/route";
import { calculate } from "../lib/saju/chart";
import { buildReading } from "../lib/saju/reading";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");
const readingId = "00000000-0000-4000-8000-000000000001";
const token = "00000000-0000-4000-8000-000000000002";
const generatedAt = "2026-09-23T09:00:00.000Z";
const shareRequest = () => new Request(`http://localhost/api/readings/${readingId}/share`, {
  method: "POST",
  headers: { "content-type": "application/json" },
});

function fakeClient(options: {
  userId?: string | null;
  authError?: unknown;
  rpcData?: unknown;
  rpcError?: unknown;
} = {}) {
  const calls: Array<[string, unknown]> = [];
  const client = {
    auth: {
      async getUser() {
        calls.push(["auth.getUser", true]);
        return {
          data: { user: options.userId === null ? null : { id: options.userId ?? "user-a" } },
          error: options.authError ?? null,
        };
      },
    },
    async rpc(name: string, args: unknown) {
      calls.push([`rpc:${name}`, args]);
      return { data: options.rpcData ?? null, error: options.rpcError ?? null };
    },
  };
  type ShareFactory = NonNullable<Parameters<typeof createPost>[0]>["createClient"];
  type PublicFactory = NonNullable<Parameters<typeof createGet>[0]>["createClient"];
  return {
    calls,
    shareFactory: (async () => client) as unknown as ShareFactory,
    publicFactory: (async () => client) as unknown as PublicFactory,
  };
}

test("비로그인은 공유 생성이 차단되고 RPC를 호출하지 않는다", async () => {
  const db = fakeClient({ userId: null });
  const response = await createPost({ createClient: db.shareFactory })(
    shareRequest(),
    { params: Promise.resolve({ id: readingId }) },
  );

  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /로그인/);
  assert.equal(db.calls.some(([name]) => name.startsWith("rpc:")), false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("공유 생성은 로그인 뒤 소유자 검증 전용 RPC에 결과 ID만 전달한다", async () => {
  const db = fakeClient({ userId: "owner-a", rpcData: token });
  const response = await createPost({ createClient: db.shareFactory })(
    shareRequest(),
    { params: Promise.resolve({ id: readingId }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token, path: `/share/${token}` });
  assert.deepEqual(db.calls.find(([name]) => name === "rpc:create_saju_reading_share"), [
    "rpc:create_saju_reading_share",
    { p_reading_id: readingId },
  ]);
  assert.equal(db.calls.some(([name]) => name.startsWith("from:")), false);

  const badId = fakeClient({ rpcData: token });
  const rejected = await createPost({ createClient: badId.shareFactory })(
    new Request("http://localhost/api/readings/not-a-uuid/share", {
      method: "POST", headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "not-a-uuid" }) },
  );
  assert.equal(rejected.status, 400);
  assert.equal(badId.calls.some(([name]) => name.startsWith("rpc:")), false);
});

test("다른 계정 결과와 RPC 장애를 공유 성공으로 표시하지 않는다", async () => {
  for (const [db, expectedStatus] of [
    [fakeClient({ rpcError: { code: "P0002", message: "reading not found" } }), 404],
    [fakeClient({ rpcError: { code: "XX000", message: "db detail" } }), 503],
    [fakeClient({ rpcData: "not-a-token" }), 404],
  ] as const) {
    const response = await createPost({ createClient: db.shareFactory })(
      shareRequest(),
      { params: Promise.resolve({ id: readingId }) },
    );
    assert.equal(response.status, expectedStatus);
    assert.doesNotMatch(JSON.stringify(await response.json()), /owner-a|user-a|reading not found|db detail/);
  }
});

test("공개 조회는 로그인 없이 정확한 토큰 RPC 한 건만 조회하고 민감정보를 반환하지 않는다", async () => {
  const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
  const reading = buildReading(chart);
  const db = fakeClient({
    userId: null,
    rpcData: [{
      chart,
      reading,
      model: "gemini-test",
      schema_version: 1,
      generated_at: generatedAt,
      user_id: "private-owner",
      email: "owner@example.com",
      birth_date: "2000-01-01",
      birth_time: "12:00",
    }],
  });
  const response = await createGet({ createClient: db.publicFactory })(
    new Request(`http://localhost/api/shared-readings/${token}`),
    { params: Promise.resolve({ token }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(db.calls, [["rpc:get_saju_reading_share", { p_token: token }]]);
  const body = await response.json();
  assert.deepEqual(body, { chart, reading, generatedAt });
  assert.doesNotMatch(JSON.stringify(body), /private-owner|owner@example\.com|2000-01-01|12:00|gemini-test/);
  assert.match(response.headers.get("cache-control") ?? "", /public/);
});

test("잘못되거나 없는 공개 토큰은 찾을 수 없고 DB 장애·손상 자료는 성공 처리하지 않는다", async () => {
  const invalid = fakeClient();
  const malformed = await createGet({ createClient: invalid.publicFactory })(
    new Request("http://localhost/api/shared-readings/bad"),
    { params: Promise.resolve({ token: "bad" }) },
  );
  assert.equal(malformed.status, 404);
  assert.deepEqual(invalid.calls, []);

  for (const [db, expectedStatus, expectedError] of [
    [fakeClient({ rpcData: [] }), 404, "공유 결과를 찾을 수 없습니다."],
    [fakeClient({ rpcError: new Error("db detail") }), 503, "공유 결과를 불러오지 못했습니다."],
    [fakeClient({ rpcData: [{ chart: {}, reading: {}, generated_at: generatedAt }] }), 502, "공유 결과의 형식을 확인하지 못했습니다."],
  ] as const) {
    const response = await createGet({ createClient: db.publicFactory })(
      new Request(`http://localhost/api/shared-readings/${token}`),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), { error: expectedError });
  }
});

test("SQL은 소유자만 생성하고 공개 단건 조회만 허용하며 직접 조회와 원본 삭제 뒤 공유를 차단한다", () => {
  const sql = source("supabase", "migrations", "20260923_create_saju_reading_shares.sql");

  assert.match(sql, /reading_id uuid not null unique references public\.saju_readings\(id\) on delete cascade/i);
  assert.match(sql, /alter table public\.saju_reading_shares enable row level security/i);
  assert.match(sql, /revoke all on public\.saju_reading_shares from anon, authenticated/i);
  assert.match(sql, /if auth\.uid\(\) is null then[\s\S]*raise insufficient_privilege/i);
  assert.match(sql, /source\.id = p_reading_id[\s\S]*source\.user_id = auth\.uid\(\)/i);
  assert.match(sql, /on conflict \(reading_id\) do update/i, "같은 원본은 같은 공유 토큰을 재사용해야 합니다");
  assert.match(sql, /where shared\.token = p_token[\s\S]*limit 1/i);
  assert.match(sql, /revoke all on function public\.create_saju_reading_share\(uuid\) from public/i);
  assert.match(sql, /grant execute on function public\.create_saju_reading_share\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.get_saju_reading_share\(uuid\) to anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|all)\s+on\s+public\.saju_reading_shares/i);
});

test("공개 화면은 로그인 CTA만 제공하고 출생 원문·계정 정보를 렌더링하지 않는다", () => {
  const page = source("app", "share", "[token]", "page.tsx");
  const view = source("app", "shared-result-view.tsx");

  assert.match(page, /<a href=["']\/["']>내 사주 보러 가기<\/a>/);
  assert.match(page, /본인의 사주를 보려면 Google 로그인이 필요합니다/);
  assert.match(page, /get_saju_reading_share/);
  assert.doesNotMatch(page + view, /user_id|userId|email|birth_date|birth_time|GEMINI_API_KEY/);
  assert.doesNotMatch(page, /<SajuForm\b|type=["']date["']|type=["']time["']/);
});

test("새 결과와 저장 이력 상세 모두 저장된 결과에만 공유 버튼을 표시한다", () => {
  const current = source("app", "saju-form.tsx");
  const history = source("app", "history", "history-view.tsx");
  const button = source("app", "share-button.tsx");

  assert.match(current, /result\.saved\s*&&\s*result\.id\s*&&\s*<ShareButton readingId=\{result\.id\}/);
  assert.match(history, /selected\.id\s*&&\s*<div[\s\S]*<ShareButton readingId=\{selected\.id\}/);
  assert.match(button, /fetch\(`\/api\/readings\/\$\{readingId\}\/share`/);
  assert.match(button, /navigator\.share/);
  assert.match(button, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(button, /공유 링크 열기/);
});
