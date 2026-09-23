import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const imageName = "saju-background-night-2026-09-23-v01.png";
const imagePath = resolve(projectRoot, "public", imageName);

test("제공된 밤하늘 배경 이미지의 내용과 크기를 보존한다", () => {
  const image = readFileSync(imagePath);

  assert.equal(
    createHash("sha256").update(image).digest("hex").toUpperCase(),
    "3AC5249F2D558F894FE2651813B292141B1C0AD5DE728779C847C35FE60032BC",
  );
  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(image.toString("ascii", 12, 16), "IHDR");
  assert.equal(image.readUInt32BE(16), 1672);
  assert.equal(image.readUInt32BE(20), 941);
});

test("페이지 배경 설정이 public 안의 실제 밤하늘 이미지를 참조한다", () => {
  const css = readFileSync(resolve(projectRoot, "app", "globals.css"), "utf8");
  const bodyRule = css.match(/(?:^|\n)body\s*\{([^}]*)\}/);
  assert.ok(bodyRule, "body 배경 설정이 있어야 합니다");

  const backgroundImage = bodyRule[1].match(/background-image\s*:\s*([^;]+);/);
  assert.ok(backgroundImage, "body에 background-image 설정이 있어야 합니다");

  const imageUrl = backgroundImage[1].match(/url\(["']?(\/[^)"']+)["']?\)/);
  assert.ok(imageUrl, "배경 이미지는 public 경로로 참조해야 합니다");
  assert.equal(imageUrl[1], `/${imageName}`);
  assert.equal(resolve(projectRoot, "public", imageUrl[1].slice(1)), imagePath);
  assert.deepEqual(readFileSync(resolve(projectRoot, "public", imageUrl[1].slice(1))).subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});

test("읽기 영역은 흰색 20%로 비치고 중첩된 결과 영역은 투명도를 높이지 않는다", () => {
  const css = readFileSync(resolve(projectRoot, "app", "globals.css"), "utf8");
  const inputCardRule = css.match(/(?:^|\n)\.input-card\s*\{([^}]*)\}/);
  const resultRule = css.match(/(?:^|\n)\.result\s*\{([^}]*)\}/);

  assert.ok(inputCardRule, "읽기 영역 스타일이 있어야 합니다");
  assert.ok(resultRule, "결과 영역 스타일이 있어야 합니다");

  const panelBackground = inputCardRule[1].match(/background\s*:\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)\s*;/);
  assert.ok(panelBackground, "읽기 영역은 투명도가 있는 흰색이어야 합니다");
  assert.deepEqual(panelBackground.slice(1).map(Number), [255, 255, 255, 0.2]);

  assert.match(resultRule[1], /background\s*:\s*transparent\s*;/,
    "안쪽 결과 영역이 별도의 흰색 배경을 겹쳐 20% 투명도를 낮추면 안 됩니다");
});
