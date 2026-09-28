"use client";

import { useEffect, useState } from "react";
import { parseDailyFortuneItem, type DailyFortuneItem } from "../../lib/saju/daily-fortune";

export default function DailyFortuneView() {
  const [items, setItems] = useState<DailyFortuneItem[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function load(allowGenerate = true) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/daily-fortunes", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object") throw new Error("오늘의 운세를 불러오지 못했습니다.");
      const data = payload as { today?: unknown; items?: unknown };
      if (typeof data.today !== "string" || !Array.isArray(data.items)) throw new Error("오늘의 운세 형식을 확인하지 못했습니다.");
      const parsed = data.items.map(parseDailyFortuneItem);
      if (parsed.some((item) => !item)) throw new Error("저장된 운세 형식을 확인하지 못했습니다.");
      const valid = parsed as DailyFortuneItem[];
      setToday(data.today);
      setItems(valid);
      if (allowGenerate && !valid.some((item) => item.fortuneDate === data.today)) await generate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "오늘의 운세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/daily-fortunes", { method: "POST" });
      const payload: unknown = await response.json();
      if (response.status === 202) {
        setError("오늘의 운세를 만들고 있습니다. 잠시 후 다시 확인해 주세요.");
        return;
      }
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload
          ? (payload as { error: unknown }).error : null;
        throw new Error(typeof message === "string" ? message : "오늘의 운세를 만들지 못했습니다.");
      }
      await load(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "오늘의 운세를 만들지 못했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { void load(); }, []); // Opened from the saju page's floating banner.

  const current = items.find((item) => item.fortuneDate === today) || null;

  return (
    <section className="input-card daily-fortune-shell" aria-labelledby="daily-fortune-title">
      <nav className="history-navigation" aria-label="사주 서비스 화면">
        <a href="/reading">새 사주 해석</a>
        <a href="/history">저장된 해석</a>
      </nav>
      <h2 id="daily-fortune-title">오늘의 운세</h2>
      {today && <p className="daily-fortune-date">{today} · 한국 시간 기준</p>}
      {(loading || generating) && <p role="status">{generating ? "오늘의 운세를 만들고 있습니다…" : "오늘의 운세를 불러오는 중입니다…"}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {error && !generating && <button type="button" className="history-more" onClick={() => void load()}>다시 시도</button>}

      {current && (
        <article className="daily-fortune-card">
          <p className="result-label">오늘의 한마디</p>
          <h3>{current.fortune.headline}</h3>
          <section><h4>종합운</h4><p>{current.fortune.overall}</p></section>
          <div className="daily-fortune-grid">
            <section><h4>일·학업운</h4><p>{current.fortune.workStudy}</p></section>
            <section><h4>금전운</h4><p>{current.fortune.finance}</p></section>
            <section><h4>관계운</h4><p>{current.fortune.relationships}</p></section>
          </div>
          <div className="action-box"><span>오늘 해볼 행동</span><p>{current.fortune.action}</p></div>
          <p className="interpretation-note">AI가 계산된 사주와 오늘의 간지를 바탕으로 작성한 자기 성찰용 참고입니다. 중요한 결정은 자신의 상황과 함께 판단해 주세요.</p>
        </article>
      )}

      {items.filter((item) => item.fortuneDate !== today).length > 0 && (
        <section className="past-fortunes" aria-labelledby="past-fortunes-title">
          <h3 id="past-fortunes-title">최근 30일 운세</h3>
          {items.filter((item) => item.fortuneDate !== today).map((item) => (
            <details key={item.id}>
              <summary>{item.fortuneDate} · {item.fortune.headline}</summary>
              <dl>
                <div><dt>종합운</dt><dd>{item.fortune.overall}</dd></div>
                <div><dt>일·학업운</dt><dd>{item.fortune.workStudy}</dd></div>
                <div><dt>금전운</dt><dd>{item.fortune.finance}</dd></div>
                <div><dt>관계운</dt><dd>{item.fortune.relationships}</dd></div>
                <div><dt>오늘 해볼 행동</dt><dd>{item.fortune.action}</dd></div>
              </dl>
            </details>
          ))}
        </section>
      )}
    </section>
  );
}
