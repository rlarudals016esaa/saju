import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");

test("로그인 페이지와 생년월일 입력 페이지는 서로 다른 화면 컴포넌트를 사용한다", () => {
  const loginPage = source("app", "page.tsx");
  const readingPage = source("app", "reading", "page.tsx");

  assert.match(loginPage, /<LoginPanel\b/);
  assert.doesNotMatch(loginPage, /<SajuForm\b|<input\b/);
  assert.match(readingPage, /<SajuForm\b/);
  assert.doesNotMatch(readingPage, /<LoginPanel\b/);
});

test("생년월일 입력 화면에는 입력과 현재 결과만 있고 이력은 별도 페이지로 이동한다", () => {
  const form = source("app", "saju-form.tsx");
  const inputStart = form.indexOf('<section className="input-card"');
  const title = form.indexOf("언제 태어나셨나요?");
  const birthDate = form.indexOf('name="date"');
  const birthTime = form.indexOf('name="time"');

  assert.ok(inputStart >= 0 && title > inputStart, "개인 화면은 생년월일 입력 카드로 시작해야 합니다");
  assert.ok(birthDate > title && birthTime > birthDate, "날짜와 시간 입력이 제목 다음에 있어야 합니다");
  assert.match(form, /href="\/history"/, "저장 결과는 별도 이력 화면에서 열 수 있어야 합니다");
  assert.doesNotMatch(form, /<aside\b|className="history-list"|<HistoryView\b|로그아웃<\/button>/,
    "입력 화면에 이력 목록과 로그아웃을 함께 표시하면 안 됩니다");
  assert.doesNotMatch(form, /fetch\(`?\/api\/readings\?page=/,
    "입력 화면이 이력 목록을 불러오면 안 됩니다");
});

test("이력 화면은 서버에서 로그인 상태를 확인하고 익명 사용자를 로그인 화면으로 보낸다", () => {
  const historyPage = source("app", "history", "page.tsx");

  assert.match(historyPage, /auth\.getUser\(\)/);
  assert.match(historyPage, /if \(!authenticated\) redirect\("\/"\)/);
  assert.match(historyPage, /<HistoryView\b/);
  assert.doesNotMatch(historyPage, /<SajuForm\b|<LoginPanel\b/);
});

test("별도 이력 화면은 저장 결과 조회·선택·삭제와 로그아웃을 유지한다", () => {
  const historyView = source("app", "history", "history-view.tsx");

  assert.match(historyView, /fetch\(`\/api\/readings\?page=\$\{page\}`/);
  assert.match(historyView, /data\.items\.map\(parseHistoryItem\)/);
  assert.match(historyView, /setSelected\(item\)/);
  assert.match(historyView, /method: "DELETE"/);
  assert.match(historyView, /auth\.signOut\(\)/);
  assert.match(historyView, /href="\/reading"/);
  assert.doesNotMatch(historyView, /name="date"|name="time"|언제 태어나셨나요\?/,
    "이력 화면에 생년월일 입력을 다시 표시하면 안 됩니다");
});
