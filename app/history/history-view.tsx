"use client";

import { useEffect, useState } from "react";
import { parseHistoryItem, type HistoryItem } from "../../lib/saju/history";
import { topicOrder } from "../../lib/saju/reading";
import { buildAnnualFlow, buildRelationGuide } from "../../lib/saju/flow";
import { createClient } from "../../lib/supabase/client";
import ElementChart from "../element-chart";
import FlowBanner from "../flow-banner";
import FinanceTiming from "../finance-timing";
import ResultFooterMeta from "../result-footer-meta";
import RelationCards from "../relation-cards";
import ShareButton from "../share-button";

export default function HistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory(page = 0, append = false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/readings?page=${page}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) {
        throw new Error(response.status === 401 ? "로그인이 만료됐습니다. 다시 로그인해 주세요." : "저장된 결과를 불러오지 못했습니다.");
      }
      const data = payload as { items: unknown[]; nextPage?: unknown };
      const parsed = data.items.map(parseHistoryItem);
      if (parsed.some((item) => !item)) throw new Error("저장된 결과의 형식을 확인하지 못했습니다.");
      setItems((previous) => append ? [...previous, ...parsed as HistoryItem[]] : parsed as HistoryItem[]);
      setNextPage(typeof data.nextPage === "number" ? data.nextPage : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장된 결과를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadHistory(); }, []); // Load once for this signed-in page.

  async function handleDelete(item: HistoryItem) {
    if (!item.id || !window.confirm("이 저장 결과를 삭제할까요? 삭제 후 복구할 수 없습니다.")) return;
    setError("");
    try {
      const response = await fetch(`/api/readings/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("저장 결과를 삭제하지 못했습니다.");
      if (selected?.id === item.id) setSelected(null);
      await loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장 결과를 삭제하지 못했습니다.");
    }
  }

  async function handleLogout() {
    try {
      const { error: logoutError } = await createClient().auth.signOut();
      if (logoutError) throw logoutError;
      setItems([]);
      setSelected(null);
      window.location.assign("/");
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  const flow = selected ? buildAnnualFlow(selected.chart) : null;
  const relations = selected ? buildRelationGuide(selected.chart) : null;

  return (
    <section className="input-card" aria-labelledby="history-title">
      <nav className="history-navigation" aria-label="사주 서비스 화면">
        <a href="/reading">생년월일 입력으로 돌아가기</a>
        <a href="/daily-fortune">오늘의 운세</a>
        <button type="button" onClick={handleLogout}>로그아웃</button>
      </nav>
      <h2 id="history-title">저장된 해석 이력</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p>저장된 결과가 아직 없습니다.</p>}
      <ul className="history-list">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => setSelected(item)} aria-pressed={selected?.id === item.id}>
              <span>{item.reading.headline}</span>
              <small>{new Date(item.generatedAt).toLocaleString("ko-KR")}</small>
            </button>
            <button type="button" className="history-delete" onClick={() => void handleDelete(item)}>삭제</button>
          </li>
        ))}
      </ul>
      {loading && <p role="status">결과 이력을 불러오는 중입니다…</p>}
      {nextPage !== null && !loading && <button type="button" className="history-more" onClick={() => void loadHistory(nextPage, true)}>이전 결과 더 보기</button>}
      {error && <button type="button" className="history-more" onClick={() => void loadHistory()}>다시 불러오기</button>}

      {selected && (
        <section className="result" aria-labelledby="history-result-title">
          <ResultFooterMeta generatedAt={selected.generatedAt} saved />
          {selected.id && <div className="result-meta"><ShareButton readingId={selected.id} /></div>}
          <h2 id="history-result-title">{selected.reading.headline}</h2>
          <p className="tendency">{selected.reading.tendency}</p>
          {selected.chart.birthTimeKnown === false && (
            <div className="unknown-time-notice" role="note" aria-label="출생시간 미반영 안내">
              <strong>출생시간 미반영</strong>
              <p>시주를 제외한 결과입니다. 정확한 출생시간이 없어 해석이 덜 세밀하거나 아쉬울 수 있으며, 시간에 따라 일부 계산값이 달라질 수 있습니다.</p>
            </div>
          )}
          <div className="summary-grid">
            <article className="summary-card"><h3>강점</h3><p>{selected.reading.strength}</p></article>
            <article className="summary-card"><h3>살펴볼 점</h3><p>{selected.reading.caution}</p></article>
          </div>
          {flow && <FlowBanner items={flow} />}
          <ElementChart chart={selected.chart} />
          <section className="advice-section" aria-label="분야별 조언">
            <h3>분야별 조언</h3>
            {topicOrder.map((topic) => (
              <article className="advice-panel history-advice" key={topic}>
                <h4>{selected.reading.advice[topic].title}</h4>
                <p>{selected.reading.advice[topic].description}</p>
                {topic === "finance" && <FinanceTiming chart={selected.chart} />}
                <div className="action-box"><span>지금 해볼 일</span><p>{selected.reading.advice[topic].action}</p></div>
                {topic === "finance" && <p className="finance-note">금전 조언은 소비 습관을 돌아보는 참고이며, 투자·대출 판단의 근거가 아닙니다.</p>}
              </article>
            ))}
          </section>
          <p className="interpretation-note">AI가 계산된 사주를 바탕으로 작성한 자기 성찰용 참고입니다. 중요한 결정은 자신의 상황과 함께 판단해 주세요.</p>
          <details className="chart-details">
            <summary>사주 계산값 자세히 보기</summary>
            <h3 className="day-pillar">{selected.chart.pillars[2].korean}일주</h3>
            <p className="day-master">일간은 {selected.chart.dayMaster.korean}{selected.chart.dayMaster.element}({selected.chart.dayMaster.character})입니다.</p>
            <dl className="pillars">
              {selected.chart.pillars.map((pillar) => (
                <div key={pillar.label}><dt>{pillar.label}</dt><dd>{pillar.text}</dd></div>
              ))}
            </dl>
            <p className="note">{selected.chart.method}</p>
          </details>
          {relations && <RelationCards guide={relations} />}
        </section>
      )}
    </section>
  );
}
