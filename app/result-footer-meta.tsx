"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ResultFooterMeta({ generatedAt, saved }: { generatedAt: string; saved: boolean }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("reading-footer-meta"));
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="reading-footer-meta">
      <strong>나의 사주 이야기</strong>
      <span>Gemini AI 해석 · 사주 수치는 별도 계산 · {new Date(generatedAt).toLocaleString("ko-KR")} 생성 · {saved ? "계정에 저장됨" : "저장되지 않음"}</span>
    </div>,
    target,
  );
}
