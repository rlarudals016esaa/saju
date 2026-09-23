import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");

test("첫 화면은 로그인 전용이고 인증된 사용자는 입력 화면으로 이동한다", () => {
  const home = source("app", "page.tsx");
  const login = source("app", "login-panel.tsx");

  assert.match(home, /auth\.getUser\(\)/, "첫 화면에서 서버 세션을 확인해야 합니다");
  assert.match(home, /redirect\(["']\/reading["']\)/, "인증된 사용자는 입력 화면으로 이동해야 합니다");
  assert.match(home, /<LoginPanel\b/, "익명 사용자에게 로그인 화면을 보여야 합니다");
  assert.doesNotMatch(home, /<SajuForm\b|type=["']date["']|type=["']time["']/,
    "첫 화면에 생년월일 입력이나 개인 결과가 있어서는 안 됩니다");
  assert.match(login, /signInWithOAuth\(/, "Google 인증을 시작할 수 있어야 합니다");
  assert.match(login, /auth_error/, "로그인 실패 원인을 로그인 화면에서 안내해야 합니다");
  assert.doesNotMatch(login, /type=["']date["']|type=["']time["']|<SajuForm\b/,
    "로그인 화면에 생년월일 입력을 렌더링하면 안 됩니다");
});

test("개인 입력 화면은 서버 인증을 거치고 익명 방문자를 로그인 화면으로 돌려보낸다", () => {
  const reading = source("app", "reading", "page.tsx");

  assert.match(reading, /auth\.getUser\(\)/, "개인 화면에서 서버 세션을 확인해야 합니다");
  assert.match(reading, /redirect\(["']\/["']\)/, "익명 사용자는 로그인 화면으로 돌아가야 합니다");
  assert.match(reading, /<SajuForm\b/, "인증된 사용자는 기존 입력·결과 화면을 볼 수 있어야 합니다");
});

test("인증 콜백은 성공하면 입력 화면, 취소·실패하면 로그인 화면으로만 보낸다", () => {
  const callback = source("app", "auth", "callback", "route.ts");

  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /new URL\(["']\/reading["'],\s*url\.origin\)/,
    "성공 목적지는 앱 내부 입력 화면으로 고정해야 합니다");
  assert.match(callback, /new URL\(["']\/\?auth_error=cancelled["'],\s*url\.origin\)/);
  assert.match(callback, /new URL\(["']\/\?auth_error=failed["'],\s*url\.origin\)/);
  assert.doesNotMatch(callback, /searchParams\.get\(["'](?:next|redirect|returnTo)["']\)/,
    "요청에서 받은 외부 이동 주소를 목적지로 쓰면 안 됩니다");
});
