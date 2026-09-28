import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(projectRoot, "app", "globals.css"), "utf8").replace(/\r\n?/g, "\n");
const bannerImage = "saju-flow-night-2026-09-23-v01.png";

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `${selector} 규칙이 있어야 합니다`);
  return match[1];
}

test("첨부한 밤하늘 이미지의 내용과 크기를 보존한다", () => {
  const image = readFileSync(resolve(projectRoot, "public", bannerImage));

  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(image.toString("ascii", 12, 16), "IHDR");
  assert.equal(image.readUInt32BE(16), 1672);
  assert.equal(image.readUInt32BE(20), 941);
  assert.equal(
    createHash("sha256").update(image).digest("hex").toUpperCase(),
    "7AACEF7680C0E966C29768C3C524DCEF0761D5B4EE149C2506A2D9DDED630100",
  );
});

test("배너에만 새 밤하늘 이미지를 사용하고 페이지 배경은 유지한다", () => {
  const banner = rule(".flow-banner");
  const body = rule("body");

  assert.match(banner, /url\("\/saju-flow-night-2026-09-23-v01\.png"\)/);
  assert.doesNotMatch(banner, /linear-gradient\(135deg|#103b68|#155b91|#167d94/);
  assert.match(banner, /linear-gradient\(rgba\(17,\s*29,\s*52,\s*0\.5\),\s*rgba\(17,\s*29,\s*52,\s*0\.5\)\)/);
  assert.match(banner, /background-size:\s*cover;/);
  assert.match(body, /url\("\/saju-background-night-2026-09-23-v01\.png"\)/);
  assert.doesNotMatch(body, /saju-flow-night/);
});

test("50% 투명도는 밤하늘 이미지 위의 막에만 적용하고 내용은 흐리지 않는다", () => {
  assert.doesNotMatch(rule(".flow-banner"), /(?:^|;)\s*opacity\s*:/);
  assert.doesNotMatch(rule(".flow-heading h3"), /(?:^|;)\s*opacity\s*:/);
  assert.doesNotMatch(rule(".flow-year"), /(?:^|;)\s*opacity\s*:/);
  assert.doesNotMatch(rule(".flow-year.current"), /(?:^|;)\s*opacity\s*:/);
});

test("밤하늘 배너의 밝은 글씨와 현재 연도 흰 카드 대비를 유지한다", () => {
  assert.match(rule(".flow-banner"), /color:\s*#ffffff;/);
  assert.match(rule(".flow-eyebrow"), /color:\s*#bceafa;/);
  assert.match(rule(".flow-heading p,\n.flow-note"), /color:\s*#e1f3fb;/);
  assert.match(rule(".flow-year"), /background:\s*rgba\(8,\s*20,\s*43,\s*0\.45\);/);
  assert.match(rule(".flow-year.current"), /color:\s*#14385a;/);
  assert.match(rule(".flow-year.current"), /background:\s*#ffffff;/);
});
