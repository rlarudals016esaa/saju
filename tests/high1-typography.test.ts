import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(root, "app", "globals.css"), "utf8");

function ruleFor(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(rule, `${selector} 스타일이 있어야 합니다`);
  return rule[1];
}

function numericWeight(rule: string, label: string): number {
  const weight = rule.match(/font-weight\s*:\s*(\d+)\s*;/);
  assert.ok(weight, `${label}에 명시적 글자 굵기가 있어야 합니다`);
  return Number(weight[1]);
}

test("하이원 원추리 제목체의 세 굵기를 실제 파일과 연결한다", () => {
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);
  const weights = new Set<number>();

  for (const face of faces) {
    if (!/font-family\s*:\s*["']?High1WonchuriTitle/i.test(face)) continue;
    const weight = numericWeight(face, "@font-face");
    weights.add(weight);

    const source = face.match(/url\(["']?(https:\/\/[^)'"\s]+\.woff2)["']?\)/i);
    assert.ok(source, `${weight} 글꼴은 실제 woff2 웹폰트 주소를 참조해야 합니다`);
    assert.match(source[1], /^https:\/\/cdn\.jsdelivr\.net\/gh\/projectnoonnu\//,
      "눈누가 제공하는 웹폰트 주소를 사용해야 합니다");
  }

  assert.deepEqual([...weights].sort((a, b) => a - b), [300, 500, 700]);
});

test("본문과 입력 요소 모두 같은 하이원 글꼴을 사용한다", () => {
  const body = ruleFor("body");
  assert.match(body, /font-family\s*:\s*["']?High1WonchuriTitle/i);
  assert.ok([300, 400].includes(numericWeight(body, "body")),
    "본문은 가벼운 굵기로 읽혀야 합니다");

  assert.match(css, /(?:input|button|select|textarea)[^{}]*\{[^}]*font\s*:\s*inherit\s*;/,
    "입력창과 버튼도 페이지 글꼴을 상속해야 합니다");
  assert.doesNotMatch(ruleFor(".pillars dd"), /font-family\s*:\s*serif/,
    "사주 한자만 이전 serif 글꼴로 남지 않아야 합니다");
});

test("배너, 주요 제목, 내용이 글자 굵기로 구분된다", () => {
  const bodyWeight = numericWeight(ruleFor("body"), "body");
  const titleWeight = numericWeight(ruleFor("h1"), "h1");
  const sectionWeight = numericWeight(ruleFor("h2"), "h2");
  const bannerWeight = numericWeight(ruleFor(".flow-heading h3"), "운의 흐름 배너 제목");

  assert.ok(titleWeight > bodyWeight, "큰 제목은 본문보다 굵어야 합니다");
  assert.ok(sectionWeight > bodyWeight, "영역 제목은 본문보다 굵어야 합니다");
  assert.ok(bannerWeight > bodyWeight, "배너 제목은 본문보다 굵어야 합니다");
  assert.equal(titleWeight, 700);
  assert.equal(bannerWeight, 700);
});

test("화면에서 글꼴 제공처를 확인할 수 있다", () => {
  const visibleSources = ["app/layout.tsx", "app/page.tsx", "app/reading/page.tsx", "app/history/page.tsx"]
    .map((file) => readFileSync(resolve(root, file), "utf8"))
    .join("\n");
  assert.match(visibleSources, /강원랜드/);
  assert.match(visibleSources, /공유마당/);
});
