import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const form = readFileSync(join(root, "app", "saju-form.tsx"), "utf8");
const history = readFileSync(join(root, "app", "history", "history-view.tsx"), "utf8");

test("입력 폼은 시간 모름 선택 시 시간 입력을 비활성화하고 서버에 상태를 보낸다", () => {
  assert.match(form, /name="unknownTime"/);
  assert.match(form, />\s*시간 모름\s*</);
  assert.match(form, /required=\{!unknownTime\}/);
  assert.match(form, /disabled=\{unknownTime\}/);
  assert.match(form, /const input = \{[\s\S]*unknownTime,[\s\S]*requestId:/);
});

test("새 결과와 이력 화면은 출생시간 미반영 및 정확도 한계를 안내한다", () => {
  for (const source of [form, history]) {
    assert.match(source, /chart\.birthTimeKnown === false/);
    assert.match(source, /출생시간 미반영/);
    assert.match(source, /시주를 제외한 결과/);
    assert.match(source, /정확한 출생시간이 없어/);
    assert.match(source, /덜 세밀하거나 아쉬울 수/);
    assert.match(source, /시간에 따라 일부 계산값이 달라질 수/);
  }
});

test("시간 모름 선택 단계에서도 결과의 한계를 미리 알린다", () => {
  assert.match(form, /unknownTime &&/);
  assert.match(form, /절기 전환일이나 23시 전후 출생/);
  assert.match(form, /결과가 덜 세밀하거나 아쉬울 수/);
});
