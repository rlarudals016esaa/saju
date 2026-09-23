"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  topicOrder,
  type ReadingTopic,
} from "../lib/saju/reading";
import {
  clearResult,
  STORAGE_KEY,
} from "../lib/saju/saved-result";
import { parseHistoryItem, type HistoryItem } from "../lib/saju/history";
import ElementChart from "./element-chart";
import FlowBanner from "./flow-banner";
import RelationCards from "./relation-cards";
import FinanceTiming from "./finance-timing";
import ResultFooterMeta from "./result-footer-meta";
import {
  buildAnnualFlow,
  buildRelationGuide,
} from "../lib/saju/flow";

export default function SajuForm({ userId }: { userId: string }) {
  const [result, setResult] = useState<HistoryItem | null>(null);
  const [legacyResultPresent, setLegacyResultPresent] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ReadingTopic>("career");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    try {
      setLegacyResultPresent(Boolean(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // The database, not browser storage, is the source of truth now.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !userId) return;
    const data = new FormData(event.currentTarget);
    const input = {
      date: String(data.get("date") || ""),
      time: String(data.get("time") || ""),
      requestId: crypto.randomUUID(),
    };

    setLoading(true);
    setError("");
    setStorageNotice("");
    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload
          ? (payload as { error: unknown }).error
          : null;
        throw new Error(typeof message === "string" ? message : "해석 요청에 실패했습니다. 다시 시도해 주세요.");
      }
      const item = parseHistoryItem(payload);
      if (!item) throw new Error("해석 결과의 형식을 확인하지 못했습니다. 다시 시도해 주세요.");
      setResult(item);
      setSelectedTopic("career");
      if (!item.saved) setStorageNotice("해석은 표시되지만 데이터베이스에 저장되지 않았습니다. 새로고침하면 사라질 수 있습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "해석에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleClearLegacy() {
    try {
      clearResult(window.localStorage);
      setLegacyResultPresent(false);
      setStorageNotice("이 기기에 남아 있던 이전 결과를 삭제했습니다.");
    } catch {
      setStorageNotice("이 기기의 이전 결과를 삭제하지 못했습니다.");
    }
  }

  async function handleDelete(item: HistoryItem) {
    if (!item.id || !window.confirm("이 저장 결과를 삭제할까요? 삭제 후 복구할 수 없습니다.")) return;
    try {
      const response = await fetch(`/api/readings/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("저장 결과를 삭제하지 못했습니다.");
      if (result?.id === item.id) setResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장 결과를 삭제하지 못했습니다.");
    }
  }

  const flow = result ? buildAnnualFlow(result.chart) : null;
  const relations = result ? buildRelationGuide(result.chart) : null;

  return (
    <section className="input-card" aria-labelledby="input-title">
      <h2 id="input-title">언제 태어나셨나요?</h2>
      <p className="form-intro">양력 생년월일과 태어난 시간을 입력해주세요.</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading}>
          <label htmlFor="date">생년월일</label>
          <input id="date" name="date" type="date" required />

          <label htmlFor="time">출생시간</label>
          <input id="time" name="time" type="time" required />

          <button type="submit">
            {loading ? "해석을 만들고 있습니다…" : "내 사주 알아보기"}
          </button>
        </fieldset>
      </form>

      <p className="storage-privacy">
        로그인 후 생성한 결과는 계정의 데이터베이스에 이력으로 저장됩니다. 출생일시 원문은 저장하지 않습니다.
      </p>
      <p className="secondary-navigation"><a href="/history">저장된 해석 이력 보기</a></p>
      {legacyResultPresent && (
        <p className="storage-privacy">이 기기에 예전 방식의 결과가 남아 있습니다. 계정에 자동으로 옮기지 않습니다. <button type="button" className="legacy-clear" onClick={handleClearLegacy}>이전 기기 결과 삭제</button></p>
      )}

      <div className="feedback" aria-live="polite">
        {loading && <p className="loading-message" role="status">Gemini가 해석 문장을 작성하는 중입니다. 잠시만 기다려 주세요.</p>}
        {error && <p className="error" role="alert">{error}{result && " 이전에 저장된 결과는 아래에 그대로 남아 있습니다."}</p>}
        {storageNotice && <p className="storage-notice">{storageNotice}</p>}
        {result && (
          <section className="result" aria-labelledby="result-title">
            <ResultFooterMeta generatedAt={result.generatedAt} saved={result.saved} />
            <div className="result-meta">
              <button type="button" onClick={() => result.saved ? void handleDelete(result) : setResult(null)}>{result.saved ? "이 결과 삭제" : "화면에서 닫기"}</button>
            </div>
            <h2 id="result-title">{result.reading.headline}</h2>
            <p className="tendency">{result.reading.tendency}</p>

            <div className="summary-grid">
              <article className="summary-card">
                <h3>강점</h3>
                <p>{result.reading.strength}</p>
              </article>
              <article className="summary-card">
                <h3>살펴볼 점</h3>
                <p>{result.reading.caution}</p>
              </article>
            </div>

            {flow && <FlowBanner items={flow} />}

            <ElementChart chart={result.chart} />

            <section className="advice-section" aria-labelledby="advice-title">
              <h3 id="advice-title">분야별 조언</h3>
              <p className="section-intro">지금 궁금한 분야를 선택해 보세요.</p>
              <div className="topic-list" role="group" aria-label="조언 분야">
                {topicOrder.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={selectedTopic === topic}
                    className={selectedTopic === topic ? "topic active" : "topic"}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    {result.reading.advice[topic].title}
                  </button>
                ))}
              </div>
              <article
                id="advice-panel"
                className="advice-panel"
                aria-live="polite"
              >
                <h4>{result.reading.advice[selectedTopic].title}</h4>
                <p>{result.reading.advice[selectedTopic].description}</p>
                {selectedTopic === "finance" && <FinanceTiming chart={result.chart} />}
                <div className="action-box">
                  <span>지금 해볼 일</span>
                  <p>{result.reading.advice[selectedTopic].action}</p>
                </div>
                {selectedTopic === "finance" && <p className="finance-note">금전 조언은 소비 습관을 돌아보는 참고이며, 투자·대출 판단의 근거가 아닙니다.</p>}
              </article>
            </section>

            <p className="interpretation-note">
              AI가 계산된 사주를 바탕으로 작성한 자기 성찰용 참고입니다.
              성격이나 미래를 확정하지 않으며, 중요한 결정은 자신의 상황과 함께 판단해 주세요.
            </p>

            <details className="chart-details">
              <summary>사주 계산값 자세히 보기</summary>
              <h3 className="day-pillar">{result.chart.pillars[2].korean}일주</h3>
              <p className="day-master">
                일간은 {result.chart.dayMaster.korean}
                {result.chart.dayMaster.element}({result.chart.dayMaster.character})입니다.
              </p>
              <dl className="pillars">
                {result.chart.pillars.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.text}</dd>
                  </div>
                ))}
              </dl>
              <p className="note">{result.chart.method}</p>
            </details>

            {relations && <RelationCards guide={relations} />}
          </section>
        )}
      </div>
    </section>
  );
}
