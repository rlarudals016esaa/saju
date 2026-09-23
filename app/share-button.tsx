"use client";

import { useState } from "react";

export default function ShareButton({ readingId }: { readingId: string }) {
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (loading) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/readings/${readingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || typeof (payload as { path?: unknown }).path !== "string") {
        throw new Error("공유 링크를 만들지 못했습니다.");
      }
      const url = new URL((payload as { path: string }).path, window.location.origin).toString();
      setLink(url);

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "나의 사주 이야기", text: "공유한 사주 해석을 확인해 보세요.", url });
          setNotice("공유 화면을 열었습니다.");
          return;
        } catch (caught) {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        setNotice("공유 링크를 복사했습니다.");
      } catch {
        setNotice("아래 링크를 직접 복사해 주세요.");
      }
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "공유 링크를 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="share-control">
      <button type="button" onClick={() => void handleShare()} disabled={loading}>
        {loading ? "공유 링크 만드는 중…" : "결과 공유하기"}
      </button>
      {notice && <span role="status">{notice}</span>}
      {link && <a href={link} target="_blank" rel="noreferrer">공유 링크 열기</a>}
    </div>
  );
}
