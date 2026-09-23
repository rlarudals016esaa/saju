import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260923_create_saju_readings.sql", import.meta.url), "utf8")
  .replace(/--[^\n]*/g, "")
  .toLowerCase();

test("사주 이력 테이블은 사용자별 접근 정책과 재시도 중복 방지를 정의한다", () => {
  assert.match(migration, /user_id\s+uuid\s+not null\s+references auth\.users\(id\)\s+on delete cascade/);
  assert.match(migration, /unique\s*\(user_id,\s*request_id\)/);
  assert.match(migration, /alter table public\.saju_readings enable row level security/);
  assert.match(migration, /grant select, insert, delete on public\.saju_readings to authenticated/);
  assert.doesNotMatch(migration, /grant[^;]*update[^;]*to authenticated/);

  for (const operation of ["select", "insert", "delete"]) {
    const policy = migration.match(new RegExp(`create policy [^;]* for ${operation} to authenticated[^;]*;`))?.[0];
    assert.ok(policy, `${operation} 정책이 있어야 합니다`);
    assert.match(policy, /auth\.uid\(\)\)\s*=\s*user_id/);
  }
});
