import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("새 결과와 저장된 결과의 계산값 펼침 제목이 공통 스타일을 사용한다", () => {
  for (const file of ["app/saju-form.tsx", "app/history/history-view.tsx"]) {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.match(source, /<details\s+className="chart-details">\s*<summary>사주 계산값 자세히 보기<\/summary>/,
      `${file}에 공통 chart-details 펼침 제목이 있어야 합니다`);
  }
});

test("계산값 펼침 제목의 글씨가 흰색이다", () => {
  const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
  const rule = css.match(/(?:^|\})\s*\.chart-details\s+summary\s*\{([^}]*)\}/m);
  assert.ok(rule, "공통 펼침 제목 스타일이 있어야 합니다");
  assert.match(rule[1], /color\s*:\s*(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))\s*;/i,
    "사주 계산값 자세히 보기 글씨는 흰색이어야 합니다");
});
