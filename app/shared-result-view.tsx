import type { SharedReading } from "../lib/saju/shared-reading";
import { topicOrder } from "../lib/saju/reading";
import { buildAnnualFlow, buildRelationGuide } from "../lib/saju/flow";
import ElementChart from "./element-chart";
import FinanceTiming from "./finance-timing";
import FlowBanner from "./flow-banner";
import RelationCards from "./relation-cards";

export default function SharedResultView({ result }: { result: SharedReading }) {
  const flow = buildAnnualFlow(result.chart);
  const relations = buildRelationGuide(result.chart);

  return (
    <section className="result shared-result" aria-labelledby="shared-result-title">
      <p className="shared-result-meta">공유된 사주 해석 · {new Date(result.generatedAt).toLocaleString("ko-KR")} 생성</p>
      <h2 id="shared-result-title">{result.reading.headline}</h2>
      <p className="tendency">{result.reading.tendency}</p>

      <div className="summary-grid">
        <article className="summary-card"><h3>강점</h3><p>{result.reading.strength}</p></article>
        <article className="summary-card"><h3>살펴볼 점</h3><p>{result.reading.caution}</p></article>
      </div>

      <FlowBanner items={flow} />
      <ElementChart chart={result.chart} />

      <section className="advice-section" aria-labelledby="shared-advice-title">
        <h3 id="shared-advice-title">분야별 조언</h3>
        {topicOrder.map((topic) => (
          <article className="advice-panel history-advice" key={topic}>
            <h4>{result.reading.advice[topic].title}</h4>
            <p>{result.reading.advice[topic].description}</p>
            {topic === "finance" && <FinanceTiming chart={result.chart} />}
            <div className="action-box"><span>지금 해볼 일</span><p>{result.reading.advice[topic].action}</p></div>
            {topic === "finance" && <p className="finance-note">금전 조언은 소비 습관을 돌아보는 참고이며, 투자·대출 판단의 근거가 아닙니다.</p>}
          </article>
        ))}
      </section>

      <p className="interpretation-note">AI가 계산된 사주를 바탕으로 작성한 자기 성찰용 참고입니다. 성격이나 미래를 확정하지 않으며, 중요한 결정은 자신의 상황과 함께 판단해 주세요.</p>
      <details className="chart-details">
        <summary>사주 계산값 자세히 보기</summary>
        <h3 className="day-pillar">{result.chart.pillars[2].korean}일주</h3>
        <p className="day-master">일간은 {result.chart.dayMaster.korean}{result.chart.dayMaster.element}({result.chart.dayMaster.character})입니다.</p>
        <dl className="pillars">
          {result.chart.pillars.map((pillar) => (
            <div key={pillar.label}><dt>{pillar.label}</dt><dd>{pillar.text}</dd></div>
          ))}
        </dl>
        <p className="note">{result.chart.method}</p>
      </details>
      <RelationCards guide={relations} />
    </section>
  );
}
