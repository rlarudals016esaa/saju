import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("결과가 있을 때 하단 서체 표기 앞에 실제 생성 정보가 표시된다", () => {
  const layout = read("app/layout.tsx");
  const footer = read("app/result-footer-meta.tsx");
  const newResult = read("app/saju-form.tsx");
  const savedResult = read("app/history/history-view.tsx");

  assert.match(layout, /<footer className="font-attribution">\s*<div id="reading-footer-meta"\s*\/>[\s\S]*?서체:/);
  assert.match(footer, /createPortal\(/);
  assert.match(footer, /나의 사주 이야기/);
  assert.match(footer, /new Date\(generatedAt\)\.toLocaleString\("ko-KR"\)/);
  assert.match(footer, /saved \? "계정에 저장됨" : "저장되지 않음"/);
  assert.match(newResult, /<ResultFooterMeta generatedAt=\{result\.generatedAt\} saved=\{result\.saved\} \/>/);
  assert.match(savedResult, /<ResultFooterMeta generatedAt=\{selected\.generatedAt\} saved \/>/);
  assert.doesNotMatch(newResult, /<p className="result-label">나의 사주 이야기<\/p>/);
  assert.doesNotMatch(newResult, /Gemini AI 해석 · 사주 수치는 별도 계산/);
  assert.doesNotMatch(savedResult, /<p className="result-label">저장된 나의 사주 이야기<\/p>/);
});
