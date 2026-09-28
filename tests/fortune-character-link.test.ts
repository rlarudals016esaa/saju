import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("생년월일 입력 중에는 플로팅 링크가 없고 해석 결과가 생기면 표시한다", () => {
  const readingPage = source("app", "reading", "page.tsx");
  const form = source("app", "saju-form.tsx");
  const dailyFortunePage = source("app", "daily-fortune", "page.tsx");
  const historyView = source("app", "history", "history-view.tsx");

  assert.match(readingPage, /<SajuForm\b/, "생년월일 입력 폼은 유지해야 합니다");
  assert.doesNotMatch(readingPage, /FloatingFortuneLink|floating-fortune-link/,
    "서버 페이지에서 플로팅 링크를 항상 표시하지 않아야 합니다");
  assert.match(form, /useState<HistoryItem \| null>\(null\)/,
    "입력 화면은 결과가 없는 상태에서 시작해야 합니다");
  assert.match(form, /\{result\s*&&\s*resultBirthDate\s*&&\s*\(\s*<FloatingFortuneLink\b/,
    "성공한 해석 결과와 해당 결과의 생년월일이 모두 있을 때에만 플로팅 링크를 표시해야 합니다");
  assert.match(form, /setResult\(item\)/,
    "해석 결과가 도착하면 플로팅 링크의 표시 조건을 만족해야 합니다");
  assert.doesNotMatch(dailyFortunePage, /FloatingFortuneLink|floating-fortune-link/,
    "오늘의 운세 페이지에는 같은 링크를 중복 표시하지 않아야 합니다");
  assert.match(historyView, /href=["']\/daily-fortune["'][^>]*>오늘의 운세/,
    "저장된 해석 화면에서 오늘의 운세 페이지로 이동하는 링크는 유지해야 합니다");
  assert.match(dailyFortunePage, /<DailyFortuneView\s*\/>/,
    "오늘의 운세 페이지에 직접 방문할 수 있어야 합니다");
});

test("플로팅 링크는 backdrop-filter 입력 카드와 feedback 바깥의 형제로 렌더링된다", () => {
  const form = source("app", "saju-form.tsx");
  const css = source("app", "globals.css");
  const inputCardRule = css.match(/\.input-card\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(inputCardRule, /backdrop-filter\s*:/,
    "입력 카드의 backdrop-filter가 유지되는 동안 플로팅 링크는 그 하위에 둘 수 없습니다");
  assert.match(form,
    /<div className="feedback"[\s\S]*?<\/div>\s*<\/section>\s*\{result\s*&&\s*resultBirthDate\s*&&\s*\(\s*<FloatingFortuneLink\b[\s\S]*?\)\}\s*<\/\>/,
    "플로팅 링크는 feedback과 input-card가 모두 닫힌 뒤 fragment의 형제로 렌더링해야 합니다");

  const cardStart = form.indexOf('<section className="input-card"');
  const floatingStart = form.indexOf("<FloatingFortuneLink", cardStart);
  const cardCloseBeforeFloating = form.lastIndexOf("</section>", floatingStart);
  const feedbackCloseBeforeFloating = form.lastIndexOf("</div>", floatingStart);

  assert.ok(cardStart >= 0 && feedbackCloseBeforeFloating > cardStart && cardCloseBeforeFloating > feedbackCloseBeforeFloating,
    "input-card와 feedback의 닫힘 태그가 플로팅 링크보다 먼저 있어야 합니다");
});

test("결과 생년월일을 준비한 뒤 오늘의 운세로 이동하는 동작을 유지한다", () => {
  const form = source("app", "saju-form.tsx");

  assert.match(form, /const \[resultBirthDate, setResultBirthDate\] = useState\(""\)/,
    "현재 해석 결과에 대응하는 생년월일 상태를 별도로 유지해야 합니다");
  assert.match(form, /setResult\(item\);\s*setResultBirthDate\(input\.date\);/,
    "해석 성공 시 해당 입력 생년월일을 결과와 함께 보관해야 합니다");
  assert.match(form,
    /\{result\s*&&\s*resultBirthDate\s*&&\s*\(\s*<FloatingFortuneLink\s+onActivate=\{\(\)\s*=>\s*prepareBirthDate\(resultBirthDate\)\}\s*\/>\s*\)\}/,
    "링크를 누르면 표시 중인 결과의 생년월일을 오늘의 운세 전달 상태에 준비해야 합니다");
});

test("생일 전달은 화면 메모리에 한 번만 남고 주소나 브라우저 저장소에 남지 않는다", () => {
  const handoff = source("app", "daily-fortune-handoff.tsx");
  const form = source("app", "saju-form.tsx");
  const link = source("app", "floating-fortune-link.tsx");
  const layout = source("app", "layout.tsx");

  assert.match(layout, /<DailyFortuneHandoffProvider>/);
  assert.match(handoff, /useRef<string \| null>\(null\)/);
  assert.match(handoff, /pendingDate\.current = date/);
  assert.match(handoff, /const date = pendingDate\.current;\s*pendingDate\.current = null;\s*return date;/);
  assert.match(form, /onActivate=\{\(\) => prepareBirthDate\(resultBirthDate\)\}/);
  assert.match(link, /href="\/daily-fortune"/);
  assert.match(link, /onClick=\{onActivate\}/);
  assert.doesNotMatch(handoff, /localStorage|sessionStorage|document\.cookie|fetch\(|URLSearchParams/);
  assert.doesNotMatch(link, /\?date=|\?birthDate=|localStorage|sessionStorage/);
});

test("결과를 닫거나 삭제하면 플로팅 링크도 사라지고, 재요청 실패 시 이전 결과는 유지된다", () => {
  const form = source("app", "saju-form.tsx");
  const deleteHandler = form.match(/async function handleDelete\([\s\S]*?\n  \}/)?.[0] ?? "";
  const closeHandler = form.match(/onClick=\{\(\) => \{\s*if \(result\.saved\)[\s\S]*?\}\}/)?.[0] ?? "";
  const catchBlock = form.match(/\} catch \(caught\) \{\s*setError\(caught instanceof Error \? caught\.message[\s\S]*?\} finally/)?.[0] ?? "";

  assert.match(closeHandler, /else\s*\{\s*setResult\(null\);\s*setResultBirthDate\(""\);\s*\}/,
    "저장되지 않은 결과를 닫으면 결과 상태를 지워야 합니다");
  assert.match(deleteHandler,
    /if \(result\?\.id === item\.id\)\s*\{\s*setResult\(null\);\s*setResultBirthDate\(""\);\s*\}/,
    "현재 저장 결과가 삭제되면 결과 상태를 지워야 합니다");
  assert.match(catchBlock, /setError\(/,
    "요청 실패를 사용자에게 알려야 합니다");
  assert.doesNotMatch(catchBlock, /setResult\(null\)/,
    "새 해석 요청 실패만으로 이전 성공 결과와 링크를 지우지 않아야 합니다");
});

test("플로팅 링크는 public의 한복 PNG를 Next Image로 렌더링한다", () => {
  const component = source("app", "floating-fortune-link.tsx");
  const assetPath = resolve(root, "public", "saju-fortune-character-hanbok-v01.png");
  const html = renderToStaticMarkup(FloatingFortuneLink());

  assert.equal(existsSync(assetPath), true, "명시한 한복 캐릭터 PNG가 public에 있어야 합니다");
  assert.deepEqual([...readFileSync(assetPath).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10],
    "캐릭터 자산은 실제 PNG 파일이어야 합니다");
  assert.match(component, /import Image from ["']next\/image["']/);
  assert.match(component, /src=["']\/saju-fortune-character-hanbok-v01\.png["']/);
  assert.match(html, /<img\b[^>]*\bdata-nimg="1"[^>]*>/,
    "Next Image 최적화가 적용된 이미지를 렌더링해야 합니다");
  assert.match(html, /(?:src|srcSet)="[^"]*url=%2Fsaju-fortune-character-hanbok-v01\.png/);
  assert.match(html, /<img\b[^>]*\bwidth="1167"[^>]*\bheight="1348"[^>]*>/,
    "원본 비율을 유지할 수 있도록 이미지 고유 크기를 제공해야 합니다");
});

test("캐릭터 전체는 오늘의 운세로 이동하는 접근 가능한 단일 링크다", () => {
  const component = source("app", "floating-fortune-link.tsx");
  const html = renderToStaticMarkup(FloatingFortuneLink());
  const link = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/)?.[0];
  const openingLink = link?.match(/^<a\b[^>]*>/)?.[0];

  assert.ok(link && openingLink, "플로팅 캐릭터를 감싸는 링크가 있어야 합니다");
  assert.match(openingLink, /class="floating-fortune-link"/);
  assert.match(openingLink, /href="\/daily-fortune"/);
  assert.match(openingLink, /aria-label="[^"]*오늘의 운세[^"]*이동[^"]*"/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.match(link, /<img\b[^>]*\balt=""[^>]*>/,
    "장식 캐릭터의 대체 텍스트는 비워 링크 이름과 중복되지 않아야 합니다");
  assert.equal(link.replace(/<[^>]+>/g, "").trim(), "",
    "기존 제목과 설명 문구를 캐릭터 옆에 표시하지 않아야 합니다");
  assert.doesNotMatch(component, /fortune-character-art|<svg\b|오늘의 운세<|빛날 하루|확인하기/i,
    "기존 SVG와 캡슐 배너 문구를 사용하지 않아야 합니다");
});

test("플로팅 캐릭터는 우측 상단 안전 영역과 모바일 크기를 적용한다", () => {
  const css = source("app", "globals.css");
  const baseRule = css.match(/\.floating-fortune-link\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(baseRule, /position\s*:\s*fixed\s*;/);
  assert.match(baseRule, /right\s*:\s*max\([^;]*env\(safe-area-inset-right\)[^;]*\)\s*;/);
  assert.match(baseRule, /top\s*:\s*max\([^;]*env\(safe-area-inset-top\)[^;]*\)\s*;/);
  assert.doesNotMatch(baseRule, /bottom\s*:/,
    "플로팅 링크는 기존 우측 하단 위치 규칙을 사용하지 않아야 합니다");
  assert.match(baseRule, /z-index\s*:\s*(?:[2-9]\d|\d{3,})\s*;/);
  assert.doesNotMatch(baseRule, /(?:background|padding)\s*:/,
    "캐릭터 뒤에 기존 캡슐 배경이나 여백을 남기지 않아야 합니다");
  assert.match(css,
    /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.floating-fortune-link\s*\{[^}]*right\s*:\s*max\([^;]*safe-area-inset-right[^;]*;[^}]*top\s*:\s*max\([^;]*safe-area-inset-top[^;]*;[^}]*width\s*:\s*min\([^;]*100vw[^;]*;/,
    "모바일에서도 상단·우측 안전 영역과 화면 너비 안에 캐릭터가 들어와야 합니다");
  assert.match(css,
    /\.floating-fortune-character\s*\{[^}]*width\s*:\s*100%\s*;[^}]*height\s*:\s*auto\s*;/,
    "반응형 크기에서도 캐릭터 이미지 비율을 유지해야 합니다");
});

test("키보드 포커스가 보이고 모션 감소 설정에서는 움직임을 멈춘다", () => {
  const css = source("app", "globals.css");

  assert.match(css,
    /\.floating-fortune-link\s*\{[^}]*animation\s*:\s*floating-fortune-link[^;}]*;/,
    "기본 설정에서는 플로팅 캐릭터가 부드럽게 움직여야 합니다");
  assert.match(css,
    /\.floating-fortune-link:focus-visible\s*\{[^}]*outline\s*:[^;}]+;[^}]*outline-offset\s*:[^;}]+;/,
    "키보드 포커스가 분명히 보여야 합니다");
  assert.match(css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.floating-fortune-link\s*\{[^}]*animation\s*:\s*none\s*;/,
    "모션 감소 설정에서는 플로팅 링크 애니메이션을 중지해야 합니다");
});
