import type { RelationGuide } from "../lib/saju/flow";

export default function RelationCards({ guide }: { guide: RelationGuide }) {
  return (
    <section className="relation-section" aria-labelledby="relation-title">
      <h3 id="relation-title">나와 다른 사주 유형 살펴보기</h3>
      <p className="section-intro">일간 오행 하나만 비교한 전통적 관계 유형입니다.</p>
      <div className="relation-grid">
        <article className="relation-card support">
          <span className="relation-tag">상생 관계 참고</span>
          <h4>나와 잘 맞을 수 있는 사주</h4>
          <p className="relation-element">{guide.support.element} 일간 <span>({guide.support.stems})</span></p>
          <p>{guide.support.description}</p>
        </article>
        <article className="relation-card tension">
          <span className="relation-tag">상극 관계 참고</span>
          <h4>갈등이 생기기 쉬운 사주</h4>
          <p className="relation-element">{guide.tension.element} 일간 <span>({guide.tension.stems})</span></p>
          <p>{guide.tension.description}</p>
        </article>
      </div>
      <p className="relation-note">
        일간 하나로 두 사람의 궁합이나 실제 관계를 판단할 수는 없습니다.
        갈등 가능성을 단정하는 결과가 아니며, 서로의 성향과 소통 방식이 더 중요합니다.
      </p>
    </section>
  );
}
