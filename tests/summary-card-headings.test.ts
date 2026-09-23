import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

for (const [file, reading] of [
  ["app/saju-form.tsx", "result"],
  ["app/history/history-view.tsx", "selected"],
] as const) {
  test(`${file} 요약 카드 제목은 강점과 살펴볼 점이고, 본문 매핑은 유지된다`, () => {
    const source = readFileSync(resolve(root, file), "utf8");

    assert.match(
      source,
      new RegExp(`<article className="summary-card">\\s*<h3>강점<\\/h3>\\s*<p>\\{${reading}\\.reading\\.strength\\}<\\/p>\\s*<\\/article>`),
      "강점 카드는 strength 내용을 보여야 합니다",
    );
    assert.match(
      source,
      new RegExp(`<article className="summary-card">\\s*<h3>살펴볼 점<\\/h3>\\s*<p>\\{${reading}\\.reading\\.caution\\}<\\/p>\\s*<\\/article>`),
      "살펴볼 점 카드는 caution 내용을 보여야 합니다",
    );
    assert.doesNotMatch(source, /강점으로 살펴볼 점|주의해서 살펴볼 점/);
  });
}
