import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DailyFortuneView from "../app/daily-fortune/daily-fortune-view";
import { DailyFortuneHandoffProvider } from "../app/daily-fortune-handoff";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");

test("오늘의 운세 첫 화면은 날짜 입력 폼이나 추측한 운세를 보여주지 않는다", () => {
  const page = source("app", "daily-fortune", "page.tsx");
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  const initialHtml = renderToStaticMarkup(createElement(DailyFortuneHandoffProvider, null, createElement(DailyFortuneView)));

  assert.match(page, /redirect\(["']\/["']\)/);
  assert.match(initialHtml, /오늘의 운세/);
  assert.match(initialHtml, /준비하고 있습니다/);
  assert.doesNotMatch(initialHtml, /<form\b|type="date"|daily-fortune-card|daily-fortune-date/);
  assert.doesNotMatch(view, /FortuneBanner|fortune-character-link|handleReveal|revealed/);
  assert.equal(existsSync(resolve(root, "app", "daily-fortune", "fortune-banner.tsx")), false);
});

test("배너에서 전달된 생일이 있을 때에만 기존 운세 API를 자동 호출한다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  assert.match(view, /const date = takeBirthDate\(\)/);
  assert.match(view, /if \(!date\) \{\s*setStatus\("missing"\);\s*return;/);
  assert.match(view, /setBirthDate\(date\);\s*void loadFortune\(date\)/);
  assert.match(view, /fetch\(["']\/api\/daily-fortunes["'],\s*\{/);
  assert.match(view, /method: ["']POST["']/);
  assert.match(view, /body: JSON\.stringify\(\{ date \}\)/);
  assert.doesNotMatch(view, /<form\b|type="date"|new FormData\(|method:\s*["']GET["']|localStorage|sessionStorage/);
});

test("생일 없이 직접 방문하면 입력 화면으로 돌아가도록 안내하고 운세를 만들지 않는다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  assert.match(view, /status === "missing"/);
  assert.match(view, /전달된 생년월일이 없습니다/);
  assert.match(view, /href="\/reading"[^>]*>새 사주 해석/);
  assert.match(view, /if \(!date\) \{\s*setStatus\("missing"\);\s*return;/);
});

test("계산 실패 시 같은 생일로 다시 시도하고 성공한 결과만 표시한다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  assert.match(view, /status === "error"/);
  assert.match(view, /<p className="error" role="alert">\{error\}<\/p>/);
  assert.match(view, /onClick=\{\(\) => void loadFortune\(birthDate\)\}>다시 시도/);
  assert.match(view, /\{result && status === "ready" && \(/);
  assert.match(view, /입력한 양력 생일 \{birthDate\} 기준/);
});

test("운세 결과는 분야별 설명과 참고 한계를 표시한다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  for (const label of ["종합운", "일·학업운", "금전운", "관계운", "오늘 해볼 행동"]) {
    assert.match(view, new RegExp(label), label);
  }
  assert.match(view, /자기 성찰용 참고/);
  assert.match(view, /출생시간을 반영하지 않아/);
  assert.match(view, /중요한 결정은 자신의 상황과 함께 판단/);
  assert.match(view, /생년월일과 운세는 저장하지 않습니다/);
  assert.match(view, /href=["']\/reading["']/);
  assert.match(view, /href=["']\/history["']/);
});

test("이력 화면의 직접 이동 링크는 생일 재입력 대신 안내 화면으로 이어진다", () => {
  const history = source("app", "history", "history-view.tsx");
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  assert.match(history, /href=["']\/daily-fortune["'][^>]*>오늘의 운세/);
  assert.match(view, /status === "missing"/);
});
