import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import { calculateDailyFortune } from "../lib/saju/daily-fortune";
import { createPost } from "../app/api/daily-fortunes/route";

function userClient(userId: string | null) {
  const calls: string[] = [];
  const client = {
    auth: { async getUser() {
      calls.push("getUser");
      return { data: { user: userId ? { id: userId } : null }, error: null };
    } },
    from(table: string) { calls.push(`from:${table}`); throw new Error("오늘의 운세는 DB를 읽거나 쓰지 않아야 합니다."); },
  };
  return { calls, factory: (async () => client) as never };
}

const now = () => new Date("2026-09-28T21:10:00Z");
const request = (body: unknown, contentType = "application/json") => new Request("http://localhost/api/daily-fortunes", {
  method: "POST", headers: { "Content-Type": contentType }, body: JSON.stringify(body),
});

test("비로그인 요청은 입력을 계산하거나 사주 테이블을 조회하기 전에 거절한다", async () => {
  const db = userClient(null);
  const response = await createPost({ createClient: db.factory, now })(request({ date: "not-a-date" }));
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /로그인/);
  assert.deepEqual(db.calls, ["getUser"]);
});

test("제출한 양력 생일을 시주 제외 사주로 계산해 한국 오늘 운세를 반환한다", async () => {
  const db = userClient("user-a");
  const response = await createPost({ createClient: db.factory, now })(request({ date: "2000-01-01" }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  const chart = calculate({ date: "2000-01-01", time: "", unknownTime: true, calendar: "solar", topic: "general" });
  assert.equal(chart.pillars.length, 3);
  assert.equal(payload.today, "2026-09-29");
  assert.deepEqual(payload.fortune, calculateDailyFortune(chart, "2026-09-29"));
  assert.equal(payload.transit.date, "2026-09-29");
  assert.deepEqual(db.calls, ["getUser"]);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("생일을 다르게 제출하면 해당 생일로 다시 계산하고 결과를 저장하지 않는다", async () => {
  const db = userClient("user-a");
  const post = createPost({ createClient: db.factory, now });
  const first = await (await post(request({ date: "2000-01-01" }))).json();
  const second = await (await post(request({ date: "2001-01-01" }))).json();
  const secondChart = calculate({ date: "2001-01-01", time: "", unknownTime: true, calendar: "solar", topic: "general" });
  assert.deepEqual(second.fortune, calculateDailyFortune(secondChart, "2026-09-29"));
  assert.notDeepEqual(first.fortune, second.fortune);
  assert.deepEqual(db.calls, ["getUser", "getUser"]);
});

test("누락·형식 오류·존재하지 않는 생일은 운세 없이 거절한다", async () => {
  const db = userClient("user-a");
  const post = createPost({ createClient: db.factory, now });
  for (const body of [{}, { date: "2000-02-30" }, { date: "abc" }, { date: 1234 }]) {
    const response = await post(request(body));
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal("fortune" in await response.json(), false);
  }
  assert.deepEqual(db.calls, ["getUser", "getUser", "getUser", "getUser"]);
});

test("JSON이 아닌 요청은 사주 계산 전에 거절한다", async () => {
  const db = userClient("user-a");
  const response = await createPost({ createClient: db.factory, now })(request({ date: "2000-01-01" }, "text/plain"));
  assert.equal(response.status, 415);
  assert.deepEqual(db.calls, ["getUser"]);
});
