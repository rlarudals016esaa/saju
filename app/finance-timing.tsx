import type { SajuChart } from "../lib/saju/chart";
import { buildFinanceTiming } from "../lib/saju/flow";

export default function FinanceTiming({ chart }: { chart: SajuChart }) {
  const timing = buildFinanceTiming(chart);

  return (
    <div className="finance-timing" aria-label="전통 사주로 보는 금전 시기">
      <strong>사주에서 금전 기회로 읽는 시기</strong>
      <p className="finance-years">{timing.years.map((year) => `${year}년`).join(" · ")}</p>
      <p>
        {timing.dayElement} 일간이 다루는 {timing.wealthElement} 오행이 그해를 대표하는 글자에 나타나는 때입니다.
        전통 사주에서는 이를 재성(돈과 관리 활동을 상징하는 오행)의 시기로 읽습니다.
      </p>
      <small>올해부터 10년 안의 연도별 상징을 현재 기준으로 계산한 참고입니다. 실제 소득과 지출, 환경, 선택에 따라 돈의 흐름은 달라집니다. 해당 연도에 돈이 들어오거나 성공한다는 보장은 아닙니다.</small>
    </div>
  );
}
