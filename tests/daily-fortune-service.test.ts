import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculate } from "../lib/saju/chart";
import { generateDailyFortuneForUser } from "../lib/saju/daily-fortune-service";

const chart = calculate({ date: "2000-01-01", time: "12:00", calendar: "solar", topic: "general" });
const fortune = {
  headline: "오늘의 기준을 살펴보세요", overall: "전체 흐름을 차분히 확인해 보세요.",
  workStudy: "작은 일부터 시작해 보세요.", finance: "지출 계획을 확인해 보세요.",
  relationships: "대화를 천천히 이어가 보세요.", action: "할 일 하나를 적어보세요.",
};

function adminFor(options: {
  claimed: boolean;
  existing?: { status: string; fortune?: unknown } | null;
}) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select(value: string) { calls.push(["select", value]); return query; },
    update(value: unknown) { calls.push(["update", value]); return query; },
    eq(column: string, value: unknown) { calls.push([`eq:${column}`, value]); return query; },
    async maybeSingle() { return { data: options.existing ?? null, error: null }; },
    then(resolve: (value: unknown) => unknown) { return Promise.resolve({ error: null }).then(resolve); },
  };
  const admin = {
    async rpc(name: string, args: unknown) {
      calls.push([`rpc:${name}`, args]);
      return { data: [{ claimed: options.claimed }], error: null };
    },
    from(table: string) { calls.push(["from", table]); return query; },
  } as unknown as SupabaseClient;
  return { admin, calls };
}

test("선점에 실패한 중복 요청은 Gemini를 호출하지 않고 완료 결과를 재사용한다", async () => {
  const db = adminFor({ claimed: false, existing: { status: "completed", fortune } });
  let generated = 0;
  const result = await generateDailyFortuneForUser({
    admin: db.admin, userId: "user-a", fortuneDate: "2026-09-29", apiKey: "key",
    reading: { id: "reading-a", chart },
    generator: async () => { generated++; return fortune; },
  });
  assert.deepEqual(result, { outcome: "existing", fortune });
  assert.equal(generated, 0);
  assert.deepEqual(db.calls.find(([name]) => name === "rpc:claim_saju_daily_fortune"), [
    "rpc:claim_saju_daily_fortune",
    { p_user_id: "user-a", p_reading_id: "reading-a", p_fortune_date: "2026-09-29" },
  ]);
});

test("선점된 요청만 생성하고 생성 실패는 failed 상태로 남긴다", async () => {
  const db = adminFor({ claimed: true });
  const result = await generateDailyFortuneForUser({
    admin: db.admin, userId: "user-a", fortuneDate: "2026-09-29", apiKey: "key",
    reading: { id: "reading-a", chart },
    generator: async () => { throw new Error("provider detail"); },
  });
  assert.equal(result.outcome, "failed");
  assert.doesNotMatch(result.error || "", /provider detail/);
  const update = db.calls.find(([name, value]) => name === "update" && (value as { status?: string }).status === "failed");
  assert.ok(update, "실패 상태를 저장해야 합니다");
});
