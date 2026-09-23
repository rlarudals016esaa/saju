import type { SajuChart } from "./chart";

export type ReadingTopic = "career" | "finance" | "love" | "relationships" | "life";

export type TopicAdvice = {
  title: string;
  description: string;
  action: string;
};

export type SajuReading = {
  headline: string;
  tendency: string;
  strength: string;
  caution: string;
  advice: Record<ReadingTopic, TopicAdvice>;
};

type Element = keyof SajuChart["elements"];

export const topicOrder: ReadingTopic[] = [
  "career",
  "finance",
  "love",
  "relationships",
  "life",
];

const readingByElement: Record<Element, SajuReading> = {
  목: {
    headline: "방향을 정하고 자라나는 힘에 주목해 보세요",
    tendency: "전통적 오행 해석에서 목은 성장과 시작을 상징합니다. 새로운 가능성을 찾는 태도를 돌아보는 실마리로 삼을 수 있습니다.",
    strength: "새로운 일을 시도하거나 배움을 이어가는 힘을 강점으로 살펴보세요.",
    caution: "여러 방향으로 한꺼번에 나아가려다 지치지는 않는지 점검해 보세요.",
    advice: {
      career: { title: "취업", description: "배우고 성장할 여지가 있는 환경이 나에게 맞는지 살펴보세요.", action: "지원하려는 곳에서 6개월 뒤 배우고 싶은 것 한 가지를 적어보세요." },
      finance: { title: "금전", description: "새로운 목표에 돈을 쓰고 싶을 때 현재 생활비와 저축 계획도 함께 살펴보세요.", action: "이번 달 새로 시작하고 싶은 일의 예상 비용을 적어보세요." },
      love: { title: "연애", description: "관계에서도 함께 성장하고 싶은 마음과 상대의 속도가 다를 수 있습니다.", action: "내가 바라는 관계의 방향을 상대에게 질문으로 전해보세요." },
      relationships: { title: "인간관계", description: "먼저 제안하는 힘을 살리되, 상대가 원하는 거리도 확인해 보세요.", action: "가까운 사람 한 명에게 요즘 필요한 도움이 무엇인지 물어보세요." },
      life: { title: "삶의 흐름", description: "새 출발의 욕구가 있다면 방향을 작게 정해 꾸준히 살펴보는 편이 도움이 됩니다.", action: "이번 달에 시작할 작은 행동 하나와 멈출 행동 하나를 적어보세요." },
    },
  },
  화: {
    headline: "열정과 표현의 균형을 살펴보세요",
    tendency: "전통적 오행 해석에서 화는 따뜻함과 표현을 상징합니다. 마음을 드러내는 방식을 돌아보는 실마리로 삼을 수 있습니다.",
    strength: "생각과 감정을 분명하게 전하는 힘을 강점으로 살펴보세요.",
    caution: "빠른 열정 뒤에 휴식과 상대의 반응을 놓치지는 않는지 점검해 보세요.",
    advice: {
      career: { title: "취업", description: "사람과 소통하거나 아이디어를 드러내는 일이 에너지를 주는지 확인해 보세요.", action: "즐겁게 설명했던 경험 한 가지를 지원 동기와 연결해 보세요." },
      finance: { title: "금전", description: "기분에 따라 지출이 커지는 순간이 있는지 살펴보면 돈의 흐름을 이해하는 데 도움이 됩니다.", action: "최근 일주일의 지출 중 계획하지 않았던 항목 하나를 표시해 보세요." },
      love: { title: "연애", description: "마음을 표현할 때 내 속도와 상대의 속도가 같은지 살펴보세요.", action: "전하고 싶은 마음과 상대에게 궁금한 점을 각각 한 문장으로 써보세요." },
      relationships: { title: "인간관계", description: "분위기를 밝히는 역할을 자주 맡는다면, 듣는 시간도 충분한지 돌아보세요.", action: "다음 대화에서 내 이야기 전에 상대의 생각을 한 번 더 물어보세요." },
      life: { title: "삶의 흐름", description: "의욕이 커질 때 회복할 시간도 함께 계획해 보세요.", action: "이번 주 일정에 쉬는 시간 한 칸을 먼저 확보해 보세요." },
    },
  },
  토: {
    headline: "꾸준함과 변화 사이의 균형을 찾아보세요",
    tendency: "전통적 오행 해석에서 토는 안정과 조율을 상징합니다. 자신이 편안함을 느끼는 기반을 돌아보는 실마리로 삼을 수 있습니다.",
    strength: "차근차근 이어가고 주변을 살피는 힘을 강점으로 살펴보세요.",
    caution: "안정을 지키려다 필요한 변화를 너무 오래 미루지는 않는지 점검해 보세요.",
    advice: {
      career: { title: "취업", description: "맡은 일을 꾸준히 완수할 수 있는 환경과 성장 기회를 함께 살펴보세요.", action: "원하는 일의 안정 조건 한 가지와 도전 조건 한 가지를 적어보세요." },
      finance: { title: "금전", description: "안정감을 주는 지출과 저축의 기준이 무엇인지 자신의 상황에 맞게 돌아보세요.", action: "매달 꼭 필요한 지출 한 가지와 조정 가능한 지출 한 가지를 적어보세요." },
      love: { title: "연애", description: "편안한 관계를 원할수록 내 필요도 조용히 숨기지 않는 것이 중요할 수 있습니다.", action: "관계에서 나에게 필요한 배려 한 가지를 말로 표현해 보세요." },
      relationships: { title: "인간관계", description: "주변을 챙기는 만큼 스스로의 경계도 지키고 있는지 살펴보세요.", action: "최근 맡은 부탁 중 조정이 필요한 것이 있는지 적어보세요." },
      life: { title: "삶의 흐름", description: "익숙한 루틴을 기반으로 작은 변화를 실험해 보세요.", action: "이번 주에 평소와 다르게 해볼 일 한 가지를 정해보세요." },
    },
  },
  금: {
    headline: "기준을 세우는 힘을 유연하게 써보세요",
    tendency: "전통적 오행 해석에서 금은 정리와 기준을 상징합니다. 자신이 중요하게 여기는 원칙을 돌아보는 실마리로 삼을 수 있습니다.",
    strength: "우선순위를 세우고 필요한 것을 분명히 하는 힘을 강점으로 살펴보세요.",
    caution: "기준을 높게 잡아 시작이나 타협이 어려워지지는 않는지 점검해 보세요.",
    advice: {
      career: { title: "취업", description: "선택 기준이 분명한 것은 도움이 되지만 모든 조건이 완벽할 필요는 없습니다.", action: "지원할 일의 필수 조건 두 가지와 양보 가능한 조건 하나를 적어보세요." },
      finance: { title: "금전", description: "돈을 쓰기 전 기준을 세우는 습관이 있는지, 그 기준이 너무 엄격하지는 않은지 살펴보세요.", action: "최근 고민한 지출 한 가지의 필요성과 만족도를 각각 적어보세요." },
      love: { title: "연애", description: "상대에게 기대하는 점과 함께 내가 유연해질 수 있는 부분도 살펴보세요.", action: "관계의 중요한 기준 하나를 이유와 함께 이야기해 보세요." },
      relationships: { title: "인간관계", description: "분명한 의견을 전할 때 상대의 사정도 함께 들으면 대화가 쉬워질 수 있습니다.", action: "의견이 다른 사람에게 그 판단의 이유를 먼저 물어보세요." },
      life: { title: "삶의 흐름", description: "정리할 것을 정한 뒤 작은 실행으로 옮겨보세요.", action: "미뤄둔 일 하나를 10분 안에 시작할 수 있는 단계로 나눠보세요." },
    },
  },
  수: {
    headline: "깊이 살피는 힘을 행동으로 이어보세요",
    tendency: "전통적 오행 해석에서 수는 관찰과 성찰을 상징합니다. 생각을 정리하는 방식을 돌아보는 실마리로 삼을 수 있습니다.",
    strength: "여러 관점을 듣고 충분히 생각하는 힘을 강점으로 살펴보세요.",
    caution: "정보를 더 모으느라 결정할 시점을 계속 늦추지는 않는지 점검해 보세요.",
    advice: {
      career: { title: "취업", description: "충분히 알아보는 습관을 살리되 지원 시점도 정해보세요.", action: "관심 직무 하나를 정하고 이번 주 지원 준비의 마감일을 적어보세요." },
      finance: { title: "금전", description: "정보를 충분히 모으는 태도와 실제 지출을 기록하는 습관을 함께 살펴보세요.", action: "이번 주 지출을 한곳에 적고 예상과 달랐던 항목을 찾아보세요." },
      love: { title: "연애", description: "마음을 오래 생각하는 동안 상대는 내 뜻을 모를 수도 있습니다.", action: "상대에게 전하고 싶은 마음 한 가지를 부담 없는 문장으로 써보세요." },
      relationships: { title: "인간관계", description: "잘 듣는 태도를 살리면서 내 의견도 대화에 남겨보세요.", action: "다음 대화에서 내 생각을 한 문장으로 덧붙여 보세요." },
      life: { title: "삶의 흐름", description: "고민을 충분히 살폈다면 작은 행동으로 확인해 보세요.", action: "오래 생각한 일 하나를 일주일짜리 실험으로 바꿔보세요." },
    },
  },
};

export function buildReading(chart: SajuChart): SajuReading {
  const element = chart.dayMaster.element as Element;
  const reading = readingByElement[element];
  if (!reading) throw new Error("해석 문구를 찾지 못했습니다.");
  return reading;
}
