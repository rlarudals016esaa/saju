import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCronGet } from "../app/api/cron/daily-fortunes/route";
import { calculate } from "../lib/saju/chart";

const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });

function adminWithTargets(rows: unknown[]) {
  const calls: Array<[string, unknown]> = [];
  const admin = {
    from(table: string) {
      calls.push(["from", table]);
      return {
        delete() { calls.push(["delete", true]); return this; },
        async lt(column: string, value: unknown) { calls.push([`lt:${column}`, value]); return { error: null }; },
      };
    },
    async rpc(name: string, args: unknown) {
      calls.push([`rpc:${name}`, args]);
      return { data: rows, error: null };
    },
  };
  return { admin, calls };
}

async function withEnv(run: () => Promise<void>) {
  const oldSecret = process.env.CRON_SECRET;
  const oldKey = process.env.GEMINI_API_KEY;
  const oldBatch = process.env.DAILY_FORTUNE_BATCH_SIZE;
  process.env.CRON_SECRET = "cron-secret";
  process.env.GEMINI_API_KEY = "gemini-secret";
  process.env.DAILY_FORTUNE_BATCH_SIZE = "10";
  try { await run(); } finally {
    if (oldSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = oldSecret;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldBatch === undefined) delete process.env.DAILY_FORTUNE_BATCH_SIZE; else process.env.DAILY_FORTUNE_BATCH_SIZE = oldBatch;
  }
}

test("Cron은 올바른 Bearer CRON_SECRET 없이는 DB 작업 전에 401", async () => withEnv(async () => {
  let adminCalls = 0;
  const get = createCronGet({
    createAdminClient: (() => { adminCalls++; throw new Error("must not run"); }) as never,
    generateForUser: (async () => ({ outcome: "created" })) as never,
    now: () => new Date("2026-09-28T21:10:00.000Z"),
  });
  for (const authorization of [undefined, "Bearer wrong", "cron-secret"]) {
    const headers = authorization ? { authorization } : undefined;
    const response = await get(new Request("http://localhost/api/cron/daily-fortunes", { headers }));
    assert.equal(response.status, 401);
  }
  assert.equal(adminCalls, 0);
}));

test("Cron은 30일 경계 밖을 삭제하고 사용자별 실패를 격리해 집계한다", async () => withEnv(async () => {
  const targets = [
    { user_id: "user-a", reading_id: "reading-a", chart },
    { user_id: "user-b", reading_id: "reading-b", chart },
  ];
  const db = adminWithTargets(targets);
  const visited: string[] = [];
  const get = createCronGet({
    createAdminClient: (() => db.admin) as never,
    generateForUser: (async ({ userId }: { userId: string }) => {
      visited.push(userId);
      return userId === "user-a" ? { outcome: "failed", error: "실패" } : { outcome: "created" };
    }) as never,
    now: () => new Date("2026-09-28T21:10:00.000Z"),
  });
  const response = await get(new Request("http://localhost/api/cron/daily-fortunes", {
    headers: { authorization: "Bearer cron-secret" },
  }));
  assert.equal(response.status, 207);
  assert.deepEqual(visited.sort(), ["user-a", "user-b"]);
  assert.deepEqual(await response.json(), {
    ok: false, date: "2026-09-29", targeted: 2,
    counts: { failed: 1, created: 1 }, hasMore: false,
  });
  assert.ok(db.calls.some(([name, value]) => name === "lt:fortune_date" && value === "2026-08-31"));
  assert.deepEqual(db.calls.find(([name]) => name === "rpc:list_saju_daily_fortune_targets"), [
    "rpc:list_saju_daily_fortune_targets", { p_fortune_date: "2026-09-29", p_limit: 11 },
  ]);
}));

test("Vercel은 매일 21:00 UTC에 고정 Cron 경로를 호출한다", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.crons, [{ path: "/api/cron/daily-fortunes", schedule: "0 21 * * *" }]);
});
