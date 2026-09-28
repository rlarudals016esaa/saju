import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260928_create_saju_daily_fortunes.sql", import.meta.url),
  "utf8",
).replace(/--[^\n]*/g, "").toLowerCase();

test("오늘의 운세 테이블은 사용자·날짜 중복을 막고 완료 데이터 형식을 제한한다", () => {
  assert.match(migration, /user_id\s+uuid\s+not null\s+references auth\.users\(id\)\s+on delete cascade/);
  assert.match(migration, /reading_id\s+uuid\s+not null\s+references public\.saju_readings\(id\)\s+on delete cascade/);
  assert.match(migration, /fortune_date\s+date\s+not null/);
  assert.match(migration, /unique\s*\(user_id,\s*fortune_date\)/);
  assert.match(migration, /status in \('pending', 'completed', 'failed'\)/);
  assert.match(migration, /status = 'completed' and fortune is not null and model is not null/);
});

test("RLS는 로그인 사용자의 완료된 자기 운세 읽기만 허용한다", () => {
  assert.match(migration, /alter table public\.saju_daily_fortunes enable row level security/);
  assert.match(migration, /revoke all on public\.saju_daily_fortunes from anon, authenticated/);
  assert.match(migration, /grant select on public\.saju_daily_fortunes to authenticated/);
  const policy = migration.match(/create policy [^;]* for select to authenticated[^;]*;/)?.[0];
  assert.ok(policy);
  assert.match(policy, /auth\.uid\(\)\)\s*=\s*user_id/);
  assert.match(policy, /status\s*=\s*'completed'/);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete|all)[^;]*to authenticated/);
});

test("선점과 대상 조회 RPC는 service_role 전용이며 최신 사주 한 건을 선택한다", () => {
  for (const signature of [
    "claim_saju_daily_fortune\\(uuid, uuid, date\\)",
    "list_saju_daily_fortune_targets\\(date, integer\\)",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${signature} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${signature} to service_role`));
  }
  assert.match(migration, /insert into public\.saju_daily_fortunes[\s\S]*on conflict \(user_id, fortune_date\) do nothing/);
  assert.match(migration, /status = 'failed' or \(status = 'pending' and updated_at < now\(\) - interval '5 minutes'\)/);
  assert.match(migration, /select distinct on \(r\.user_id\)[\s\S]*order by r\.user_id, r\.created_at desc, r\.id desc/);
  assert.match(migration, /f\.status = 'completed'/);
});
