import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dirname, "../app/globals.css"), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(match, `${selector} 스타일이 있어야 합니다`);
  return match[1];
}

function property(block: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+);`));
  assert.ok(match, `${name} 설정이 있어야 합니다`);
  return match[1].trim().toLowerCase();
}

function rgb(value: string): [number, number, number] {
  const variable = value.match(/^var\((--[a-z-]+)\)$/);
  if (variable) return rgb(property(rule(":root"), variable[1]));
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  assert.ok(hex, `색상은 비교 가능한 #RGB 또는 #RRGGBB이어야 합니다: ${value}`);
  const expanded = hex[1].length === 3
    ? [...hex[1]].map((digit) => digit + digit).join("")
    : hex[1];
  return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(value: string): number {
  const linear = rgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function expectLight(value: string, label: string): void {
  assert.ok(luminance(value) > 0.55, `${label}은 밤하늘 위에 보이는 밝은 글씨여야 합니다: ${value}`);
}

function expectDark(value: string, label: string): void {
  assert.ok(luminance(value) < 0.25, `${label}은 밝은 카드 위에 보이는 어두운 글씨여야 합니다: ${value}`);
}

test("반투명 읽기 박스의 기본 글씨와 보조 글씨가 밝다", () => {
  const panel = rule(".input-card");
  expectLight(property(panel, "color"), "읽기 박스 기본 글씨");
  expectLight(property(panel, "--muted"), "읽기 박스 보조 글씨");
});

test("읽기 박스의 연결 글씨가 밝고 오행 그래프 글씨는 밝은 색 변수를 사용한다", () => {
  expectLight(property(rule(".history-navigation a,\n.secondary-navigation a"), "color"), "이력 화면 이동 링크");
  expectLight(property(rule(".element-axis-label"), "fill"), "오행 그래프 축 글씨");
});

test("실제 밝은 배경의 입력칸과 카드에는 어두운 글씨가 남는다", () => {
  for (const selector of [
    "input",
    ".summary-card",
    ".finance-timing",
    ".action-box",
    ".relation-card",
    ".history-list li > button:first-child",
    ".flow-year.current",
  ]) {
    expectDark(property(rule(selector), "color"), selector);
  }
});

test("읽기 박스의 흰색 배경 투명도는 20%로 유지된다", () => {
  assert.match(property(rule(".input-card"), "background"), /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.2\s*\)$/);
});
