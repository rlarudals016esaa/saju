import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import FloatingFortuneLink from "../app/floating-fortune-link";

const root = resolve(import.meta.dirname, "..");
const source = (...parts: string[]) => readFileSync(resolve(root, ...parts), "utf8");

test("사주 생성 성공 뒤 자동 이동하지 않고 현재 페이지에 결과를 유지한다", () => {
  const form = source("app", "saju-form.tsx");
  const parsed = form.indexOf("const item = parseHistoryItem(payload)");
  const retained = form.indexOf("setResult(item)", parsed);
  const resultView = form.indexOf("{result && (", retained);

  assert.ok(parsed >= 0 && retained > parsed && resultView > retained,
    "정상 응답은 상태에 저장한 뒤 현재 페이지의 결과 영역에 표시해야 합니다");
  assert.doesNotMatch(form, /window\.location\.(?:assign|replace)|router\.(?:push|replace)\(["']\/daily-fortune/);
});

test("로그인된 사주 페이지는 입력 폼과 독립된 오늘의 운세 플로팅 링크를 렌더링한다", () => {
  const page = source("app", "reading", "page.tsx");
  const formPosition = page.indexOf("<SajuForm");
  const floatingPosition = page.indexOf("<FloatingFortuneLink");

  assert.match(page, /import FloatingFortuneLink from ["']\.\.\/floating-fortune-link["']/);
  assert.ok(formPosition >= 0 && floatingPosition > formPosition,
    "사주 입력 폼과 플로팅 링크를 같은 로그인 페이지에서 렌더링해야 합니다");
});

test("플로팅 캐릭터 전체는 오늘의 운세로 이동하는 접근 가능한 링크다", () => {
  const linkSource = source("app", "floating-fortune-link.tsx");
  const artSource = source("app", "fortune-character-art.tsx");
  const html = renderToStaticMarkup(FloatingFortuneLink());
  const openingLink = html.match(/^<a\b[^>]*>/)?.[0];

  assert.match(linkSource, /import FortuneCharacterArt from ["']\.\/fortune-character-art["']/,
    "재사용하는 장식 그림은 독립 컴포넌트에서 가져와야 합니다");
  assert.match(artSource, /aria-hidden=["']true["']/);
  assert.ok(openingLink, "플로팅 컴포넌트의 최상위 요소는 링크여야 합니다");
  assert.match(openingLink, /class="floating-fortune-link"/);
  assert.match(openingLink, /href="\/daily-fortune"/);
  assert.match(openingLink, /aria-label="[^"]*오늘의 운세[^"]*이동[^"]*"/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.match(html, /<span class="fortune-character-art" aria-hidden="true"><svg\b[^>]*role="presentation"/);
  assert.doesNotMatch(html, /<svg\b[^>]*aria-label=|<title>/);
});

test("사주 페이지의 운세 링크는 우측 하단에 안전하게 떠 있고 모션 설정을 존중한다", () => {
  const css = source("app", "globals.css");

  assert.match(css,
    /\.floating-fortune-link\s*\{[^}]*position\s*:\s*fixed\s*;[^}]*right\s*:\s*max\([^;]*safe-area-inset-right[^;]*;[^}]*bottom\s*:\s*max\([^;]*safe-area-inset-bottom[^;]*;[^}]*z-index\s*:\s*(?:[2-9]\d|\d{3,})\s*;/,
    "플로팅 링크는 안전 영역을 반영한 우측 하단에서 다른 내용 위에 보여야 합니다");
  assert.match(css,
    /\.floating-fortune-link\s*\{[^}]*animation\s*:\s*floating-fortune-link[^;}]*;/,
    "플로팅 링크 전체가 둥둥 움직여야 합니다");
  assert.match(css,
    /\.floating-fortune-link:focus-visible\s*\{[^}]*outline\s*:[^;}]+;[^}]*outline-offset\s*:[^;}]+;/,
    "키보드 포커스가 분명히 보여야 합니다");
  assert.match(css,
    /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.floating-fortune-link\s*\{[^}]*right\s*:\s*max\([^;]*safe-area-inset-right[^;]*;[^}]*bottom\s*:\s*max\([^;]*safe-area-inset-bottom[^;]*;[^}]*width\s*:\s*min\([^;]*100vw[^;]*;/,
    "모바일에서도 화면과 안전 영역 안에 플로팅 링크가 들어와야 합니다");
  assert.match(css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.floating-fortune-link\s*\{[^}]*animation\s*:\s*none\s*;/,
    "모션 감소 설정에서는 플로팅 링크 애니메이션을 중지해야 합니다");
});
