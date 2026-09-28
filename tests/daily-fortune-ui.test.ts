import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DailyFortuneView from "../app/daily-fortune/daily-fortune-view";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");

test("오늘의 운세 화면에는 두 번째 캐릭터 배너나 클릭 안내가 없다", () => {
  const page = source("app", "daily-fortune", "page.tsx");
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");
  const css = source("app", "globals.css");
  const initialHtml = renderToStaticMarkup(createElement(DailyFortuneView));

  assert.match(page, /redirect\(["']\/["']\)/);
  assert.doesNotMatch(view, /FortuneBanner|fortune-character-link|handleReveal|revealed/);
  assert.doesNotMatch(initialHtml, /fortune-character-link|별빛 도사|배너를 눌러|운세 보기/);
  assert.doesNotMatch(css, /\.fortune-character-link(?:\b|:)/);
  assert.equal(existsSync(resolve(root, "app", "daily-fortune", "fortune-banner.tsx")), false,
    "제거한 대형 배너 컴포넌트 파일을 남겨두면 안 됩니다");
  assert.doesNotMatch(initialHtml, /daily-fortune-card|past-fortunes|daily-fortune-date/);
  assert.doesNotMatch(initialHtml, /종합운|일·학업운|금전운|관계운|오늘 해볼 행동|최근 30일 운세/);
  assert.match(initialHtml, /role="status"[^>]*>오늘의 운세를 불러오는 중입니다/);
});

test("오늘의 운세 화면은 마운트 즉시 GET하고 오늘 결과가 없을 때만 POST 생성한다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");

  assert.match(view, /import \{ useEffect, useState \} from ["']react["']/);
  assert.match(view, /useEffect\(\(\) => \{\s*void load\(\);\s*\}, \[\]\)/,
    "마운트 직후 별도 클릭 없이 조회를 시작해야 합니다");
  assert.match(view, /fetch\(["']\/api\/daily-fortunes["'],\s*\{\s*cache:\s*["']no-store["']\s*\}\)/);
  assert.match(view,
    /if \(allowGenerate && !valid\.some\(\(item\) => item\.fortuneDate === data\.today\)\) await generate\(\)/);
  assert.match(view, /fetch\(["']\/api\/daily-fortunes["'],\s*\{\s*method:\s*["']POST["']\s*\}\)/);
});

test("로딩·오류·재시도와 오늘 및 과거 운세 표시를 유지한다", () => {
  const view = source("app", "daily-fortune", "daily-fortune-view.tsx");

  for (const label of ["종합운", "일·학업운", "금전운", "관계운", "오늘 해볼 행동", "최근 30일 운세"]) {
    assert.match(view, new RegExp(label.replace("·", "\\·")), label);
  }
  assert.match(view, /\{\(loading \|\| generating\) && <p role="status">/);
  assert.match(view, /\{error && <p className="error" role="alert">/);
  assert.match(view, /\{error && !generating && <button[^>]*onClick=\{\(\) => void load\(\)\}>다시 시도<\/button>/);
  assert.match(view, /\{current && \(/);
  assert.match(view, /items\.filter\(\(item\) => item\.fortuneDate !== today\)/);
  assert.match(view, /다시 시도/);
  assert.match(view, /자기 성찰용 참고/);
  assert.match(view, /중요한 결정은 자신의 상황과 함께 판단/);
  assert.match(view, /href=["']\/reading["']/);
  assert.match(view, /href=["']\/history["']/);
});

test("이력 화면에서는 오늘의 운세로 직접 이동할 수 있다", () => {
  const history = source("app", "history", "history-view.tsx");

  assert.match(history, /href=["']\/daily-fortune["'][^>]*>오늘의 운세/);
});
