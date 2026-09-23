import test from "node:test";
import assert from "node:assert/strict";
import { createGet } from "../app/api/readings/route";
import { createDelete } from "../app/api/readings/[id]/route";

const id = "00000000-0000-4000-8000-000000000001";

function fakeClient(options: {
  userId?: string | null; rows?: unknown[]; count?: number; row?: unknown; error?: unknown;
} = {}) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select(columns: string, config?: unknown) { calls.push(["select", [columns, config]]); return query; },
    eq(column: string, value: unknown) { calls.push([`eq:${column}`, value]); return query; },
    order(column: string, config: unknown) { calls.push(["order", [column, config]]); return query; },
    range(from: number, to: number) { calls.push(["range", [from, to]]); return query; },
    delete() { calls.push(["delete", true]); return query; },
    async maybeSingle() { return { data: options.row ?? null, error: options.error ?? null }; },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: options.rows ?? [], count: options.count ?? 0, error: options.error ?? null }).then(resolve);
    },
  };
  const client = {
    auth: { async getUser() { return { data: { user: options.userId === null ? null : { id: options.userId ?? "user-a" } }, error: null }; } },
    from(table: string) { calls.push(["from", table]); return query; },
  };
  type ClientFactory = NonNullable<Parameters<typeof createGet>[0]>["createClient"];
  return { calls, createClient: (async () => client) as unknown as ClientFactory };
}

test("이력 목록은 비로그인 차단 후 계정별 최신순 10건씩 조회한다", async () => {
  const anon = fakeClient({ userId: null });
  const noAccess = await createGet({ createClient: anon.createClient })(new Request("http://localhost/api/readings"));
  assert.equal(noAccess.status, 401);
  assert.deepEqual(anon.calls, []);

  const rows = [{ id: "first" }];
  const db = fakeClient({ userId: "user-b", rows, count: 21 });
  const response = await createGet({ createClient: db.createClient })(new Request("http://localhost/api/readings?page=1"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: rows, nextPage: 2 });
  assert.ok(db.calls.some(([name, value]) => name === "eq:user_id" && value === "user-b"));
  assert.ok(db.calls.some(([name, value]) => name === "range" && JSON.stringify(value) === "[10,19]"));
  assert.deepEqual(db.calls.filter(([name]) => name === "order").map(([, value]) => (value as unknown[])[0]), ["created_at", "id"]);
});

test("잘못된 페이지는 조회하지 않고, 마지막 페이지와 DB 실패를 구분한다", async () => {
  const db = fakeClient({ count: 11 });
  const get = createGet({ createClient: db.createClient });
  assert.equal((await get(new Request("http://localhost/api/readings?page=-1"))).status, 400);
  assert.deepEqual(db.calls, []);
  const last = await get(new Request("http://localhost/api/readings?page=1"));
  assert.equal((await last.json()).nextPage, null);
  const unavailable = fakeClient({ error: new Error("db offline") });
  assert.equal((await createGet({ createClient: unavailable.createClient })(new Request("http://localhost/api/readings"))).status, 503);
});

test("한 건 삭제는 인증과 사용자 ID를 모두 적용하며 타 계정 행은 404", async () => {
  const context = { params: Promise.resolve({ id }) };
  const anon = fakeClient({ userId: null });
  assert.equal((await createDelete({ createClient: anon.createClient })(new Request("http://localhost/api/readings/" + id), context)).status, 401);
  assert.deepEqual(anon.calls, []);

  const db = fakeClient({ userId: "user-a", row: { id } });
  const remove = createDelete({ createClient: db.createClient });
  const removed = await remove(new Request("http://localhost/api/readings/" + id), context);
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { deleted: true });
  assert.ok(db.calls.some(([name, value]) => name === "eq:user_id" && value === "user-a"));
  assert.ok(db.calls.some(([name, value]) => name === "eq:id" && value === id));

  const otherAccount = fakeClient({ userId: "user-b" });
  assert.equal((await createDelete({ createClient: otherAccount.createClient })(new Request("http://localhost/api/readings/" + id), context)).status, 404);
  assert.equal((await remove(new Request("http://localhost/api/readings/bad"), { params: Promise.resolve({ id: "bad" }) })).status, 400);
});

test("삭제 DB 오류를 성공으로 표시하지 않는다", async () => {
  const db = fakeClient({ error: new Error("db offline") });
  const response = await createDelete({ createClient: db.createClient })(
    new Request("http://localhost/api/readings/" + id), { params: Promise.resolve({ id }) },
  );
  assert.equal(response.status, 503);
});
