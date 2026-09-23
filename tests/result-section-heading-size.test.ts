import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(root, "app", "globals.css"), "utf8");

function fontSizeFor(selector: string): string {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const matching = rules.filter(([, selectors, declarations]) =>
    selectors.split(",").some((part) => part.trim() === selector) && /font-size\s*:/.test(declarations));
  assert.ok(matching.length > 0, `${selector}에 글자 크기가 지정되어야 합니다`);
  const declaration = matching.at(-1)![2].match(/font-size\s*:\s*([^;]+)\s*;/);
  assert.ok(declaration, `${selector}의 글자 크기를 읽을 수 있어야 합니다`);
  return declaration[1].trim();
}

test("오행 분포와 분야별 조언 제목이 운의 흐름 배너 제목과 같은 크기다", () => {
  const bannerSize = fontSizeFor(".flow-heading h3");
  assert.equal(bannerSize, "25px");
  assert.equal(fontSizeFor(".element-section h3"), bannerSize);
  assert.equal(fontSizeFor(".advice-section h3"), bannerSize);
  assert.equal(fontSizeFor(".summary-card h3"), "18px", "강점·살펴볼 점 카드 제목은 그대로 둡니다");
});

test("새 결과와 저장된 결과가 동일한 영역 제목 요소와 스타일을 공유한다", () => {
  const chart = readFileSync(resolve(root, "app", "element-chart.tsx"), "utf8");
  const banner = readFileSync(resolve(root, "app", "flow-banner.tsx"), "utf8");
  const newResult = readFileSync(resolve(root, "app", "saju-form.tsx"), "utf8");
  const savedResult = readFileSync(resolve(root, "app", "history", "history-view.tsx"), "utf8");

  assert.match(chart, /className="element-section"[\s\S]*?<h3[^>]*>나의 오행 분포<\/h3>/);
  assert.match(banner, /className="flow-heading"[\s\S]*?<h3[^>]*>운의 흐름 살펴보기<\/h3>/);
  for (const source of [newResult, savedResult]) {
    assert.match(source, /<FlowBanner\b/);
    assert.match(source, /<ElementChart\b/);
    assert.match(source, /className="advice-section"[\s\S]*?<h3[^>]*>분야별 조언<\/h3>/);
  }
});
