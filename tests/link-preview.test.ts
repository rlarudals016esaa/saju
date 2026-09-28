import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const layout = readFileSync(resolve(projectRoot, "app", "layout.tsx"), "utf8");
const previewName = "saju-link-preview-2026-09-23-v01.png";

test("공개 미리보기 PNG가 예상 크기와 내용으로 보존된다", () => {
  const image = readFileSync(resolve(projectRoot, "public", previewName));
  assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(image.toString("ascii", 12, 16), "IHDR");
  assert.equal(image.readUInt32BE(16), 1730);
  assert.equal(image.readUInt32BE(20), 909);
  assert.equal(
    createHash("sha256").update(image).digest("hex").toUpperCase(),
    "C4AED11AE9D04F283C907638E11BBFA92E2DF741B53A3A79CBF44343BE2C9A33",
  );
});

test("사이트 공통 Open Graph와 Twitter 카드에 같은 공개 이미지와 소개 문구를 쓴다", () => {
  assert.match(layout, /const title = "나를 이해하는 사주 이야기";/);
  assert.match(layout, /const description = "성향과 강점·약점을 살펴보고 취업, 연애, 인간관계, 삶의 흐름을 돌아보는 사주 서비스";/);
  assert.match(layout, /const previewImage = "\/saju-link-preview-2026-09-23-v01\.png";/);
  assert.match(layout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(layout, /openGraph:\s*\{\s*type: "website",\s*title,\s*description,\s*images: \[\{ url: previewImage, width: 1730, height: 909, alt: "[^"]+" \}\]/);
  assert.match(layout, /twitter:\s*\{\s*card: "summary_large_image",\s*title,\s*description,\s*images: \[previewImage\]/);
  assert.doesNotMatch(layout, /birth(Date|Time)|dateOfBirth|userId|reading\.summary/);
});

test("공개 사이트 주소가 있으면 이를 사용하고, 없으면 Vercel 주소와 로컬 주소 순서로 대체한다", () => {
  const source = layout.match(/const siteUrl = ([\s\S]*?);\s*\n\s*export const metadata/);
  assert.ok(source, "사이트 주소 선택식이 있어야 합니다");
  const getSiteUrl = new Function("process", `return ${source[1]};`) as (process: { env: Record<string, string | undefined> }) => string;
  const env = (values: Record<string, string | undefined>) => getSiteUrl({ env: values });

  assert.equal(env({ NEXT_PUBLIC_SITE_URL: "https://saju.example" }), "https://saju.example");
  assert.equal(env({ VERCEL_PROJECT_PRODUCTION_URL: "saju.vercel.app" }), "https://saju.vercel.app");
  assert.equal(env({ VERCEL_URL: "preview-saju.vercel.app" }), "https://preview-saju.vercel.app");
  assert.equal(env({}), "http://localhost:3000");
});
