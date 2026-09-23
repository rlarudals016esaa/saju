import type { AnnualFlowItem } from "../lib/saju/flow";

export default function FlowBanner({ items }: { items: AnnualFlowItem[] }) {
  return (
    <section className="flow-banner" aria-labelledby="flow-title">
      <div className="flow-heading">
        <span className="flow-eyebrow">지난해부터 내년까지</span>
        <h3 id="flow-title">운의 흐름 살펴보기</h3>
        <p>연도별 대표 오행과 나의 일간이 만나는 주제를 가볍게 비교해 보세요.</p>
      </div>
      <ol className="flow-years">
        {items.map((item) => (
          <li key={item.year} className={item.label === "올해" ? "flow-year current" : "flow-year"}>
            <span className="flow-year-label">{item.label} · {item.year}</span>
            <strong>{item.pillar}년</strong>
            <span className="flow-element">{item.element}의 기운</span>
            <span className="flow-theme">{item.theme}</span>
            <p>{item.description}</p>
          </li>
        ))}
      </ol>
      <p className="flow-note">
        각 연도의 입춘 이후 대표 연주를 6월 15일 기준으로 비교한 간단한 참고입니다.
        대운·세운 전체를 계산하거나 미래 사건을 예측한 결과는 아닙니다.
      </p>
    </section>
  );
}
