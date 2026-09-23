import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(root, "app", "globals.css"), "utf8");

test("로그인과 입력 화면의 소개 문구에는 강제 줄바꿈이 없다", () => {
  for (const file of ["app/page.tsx", "app/reading/page.tsx"]) {
    const page = readFileSync(resolve(root, file), "utf8");
    const intro = page.match(/<p className="intro">([\s\S]*?)<\/p>/);
    assert.ok(intro, `${file}에 소개 문구가 있어야 합니다`);
    assert.doesNotMatch(intro[1], /<br\s*\/?\s*>|<wbr\s*\/?\s*>/i,
      `${file}의 소개 문구에는 강제 줄바꿈이 없어야 합니다`);
  }
});

test("넓은 화면의 소개 문구는 충분한 너비에서 한 줄로 표시한다", () => {
  const rule = css.match(/(?:^|\})\s*\.intro\s*\{([^}]*)\}/m);
  assert.ok(rule, "공통 .intro 스타일이 있어야 합니다");
  assert.match(rule[1], /white-space\s*:\s*nowrap\s*;/,
    "넓은 화면에서는 소개 문구가 줄바뀌지 않아야 합니다");
  assert.doesNotMatch(rule[1], /max-width\s*:\s*(?:520px|[0-4]\d\dpx)\s*;/,
    "소개 문구 너비가 기존의 좁은 520px 이하로 제한되면 안 됩니다");
  assert.doesNotMatch(rule[1], /overflow\s*:\s*hidden\s*;|text-overflow\s*:\s*ellipsis\s*;/,
    "한 줄로 만들기 위해 글자를 숨기거나 생략하면 안 됩니다");
});

test("좁은 화면에서는 소개 문구가 다시 줄바뀌어 글자가 잘리지 않는다", () => {
  const responsive = [...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)(?=\n\})/g)]
    .filter((match) => Number(match[1]) >= 760);
  assert.ok(responsive.some((match) => /\.intro\s*\{[^}]*white-space\s*:\s*normal\s*;[^}]*\}/.test(match[2])),
    "760px 이하에서는 .intro가 자연스럽게 줄바뀌어야 합니다");
});
