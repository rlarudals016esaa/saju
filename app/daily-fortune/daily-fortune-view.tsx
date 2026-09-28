"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDailyFortuneHandoff } from "../daily-fortune-handoff";
import type { DailyFortune, DailyTransit } from "../../lib/saju/daily-fortune";

type DailyFortuneResponse = {
  today: string;
  transit: DailyTransit;
  fortune: DailyFortune;
};

type ViewStatus = "checking" | "missing" | "loading" | "ready" | "error";

export default function DailyFortuneView() {
  const { takeBirthDate } = useDailyFortuneHandoff();
  const started = useRef(false);
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<DailyFortuneResponse | null>(null);
  const [status, setStatus] = useState<ViewStatus>("checking");
  const [error, setError] = useState("");

  const loadFortune = useCallback(async (date: string) => {
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/daily-fortunes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload
          ? (payload as { error: unknown }).error : null;
        throw new Error(typeof message === "string" ? message : "오늘의 운세를 불러오지 못했습니다.");
      }
      const data = payload as Partial<DailyFortuneResponse>;
      if (typeof data.today !== "string" || !data.transit || !data.fortune) {
        throw new Error("오늘의 운세 형식을 확인하지 못했습니다.");
      }
      setResult(data as DailyFortuneResponse);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "오늘의 운세를 불러오지 못했습니다.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const date = takeBirthDate();
    if (!date) {
      setStatus("missing");
      return;
    }
    setBirthDate(date);
    void loadFortune(date);
  }, [loadFortune, takeBirthDate]);

  return (
    <section className="input-card daily-fortune-shell" aria-labelledby="daily-fortune-title">
      <nav className="history-navigation" aria-label="사주 서비스 화면">
        <a href="/reading">새 사주 해석</a>
        <a href="/history">저장된 해석</a>
      </nav>
      <h2 id="daily-fortune-title">오늘의 운세</h2>
      {status === "checking" && <p role="status">오늘의 운세를 준비하고 있습니다…</p>}
      {status === "missing" && (
        <p className="form-intro">전달된 생년월일이 없습니다. <a href="/reading">새 사주 해석</a>을 완료한 뒤 플로팅 배너를 눌러 주세요.</p>
      )}
      {status === "loading" && <p role="status">입력한 생년월일로 오늘의 운세를 계산하는 중입니다…</p>}
      {status === "error" && (
        <div>
          <p className="error" role="alert">{error}</p>
          <button type="button" onClick={() => void loadFortune(birthDate)}>다시 시도</button>
        </div>
      )}
      {result && status === "ready" && (
        <>
          <p className="daily-fortune-date">
            입력한 양력 생일 {birthDate} 기준 · {result.today} · {result.transit.dayPillar.korean}일 · 한국 시간 기준
          </p>
          <article className="daily-fortune-card">
            <p className="result-label">오늘의 한마디</p>
            <h3>{result.fortune.headline}</h3>
            <section><h4>종합운</h4><p>{result.fortune.overall}</p></section>
            <div className="daily-fortune-grid">
              <section><h4>일·학업운</h4><p>{result.fortune.workStudy}</p></section>
              <section><h4>금전운</h4><p>{result.fortune.finance}</p></section>
              <section><h4>관계운</h4><p>{result.fortune.relationships}</p></section>
            </div>
            <div className="action-box"><span>오늘 해볼 행동</span><p>{result.fortune.action}</p></div>
            <p className="interpretation-note">입력한 양력 생일의 세 기둥과 오늘의 간지를 바탕으로 고른 자기 성찰용 참고입니다. 출생시간을 반영하지 않아 정확한 사주 해석보다 제한적이며, 중요한 결정은 자신의 상황과 함께 판단해 주세요.</p>
          </article>
        </>
      )}
      <p className="storage-privacy">해석에 입력한 생년월일을 한 번만 전달해 계산합니다. 생년월일과 운세는 저장하지 않습니다.</p>
    </section>
  );
}
