import type { SajuChart } from "./chart";
import { calculate } from "./chart";

const elements = ["목", "화", "토", "금", "수"] as const;
type Element = typeof elements[number];

export type DailyFortune = {
  headline: string;
  overall: string;
  workStudy: string;
  finance: string;
  relationships: string;
  action: string;
};

export type DailyTransit = {
  date: string;
  dayPillar: Pick<SajuChart["pillars"][number], "text" | "korean" | "stemElement" | "branchElement">;
};

const generates: Record<Element, Element> = {
  목: "화", 화: "토", 토: "금", 금: "수", 수: "목",
};

const controls: Record<Element, Element> = {
  목: "토", 화: "금", 토: "수", 금: "목", 수: "화",
};

const headlineByElement: Record<Element, string> = {
  목: "작은 시작을 키워보는 날",
  화: "마음을 밝게 표현해보는 날",
  토: "기준을 단단히 다져보는 날",
  금: "중요한 것을 선명하게 고르는 날",
  수: "흐름을 살피며 유연하게 움직이는 날",
};

const financeByElement: Record<Element, string> = {
  목: "새 지출을 늘리기보다 앞으로 필요한 항목을 한 가지 적어보세요.",
  화: "기분에 따른 소비가 없는지 결제 전에 한 번 더 확인해 보세요.",
  토: "오늘 쓸 금액의 기준을 먼저 정하면 마음이 한결 편해질 수 있습니다.",
  금: "꼭 필요한 지출과 미뤄도 되는 지출을 나누어 살펴보세요.",
  수: "작은 지출의 흐름을 기록하고 예상 밖 항목이 있는지 확인해 보세요.",
};

const actionByElement: Record<Element, string> = {
  목: "미뤄둔 일의 첫 단계를 10분만 시작해 보세요.",
  화: "고마운 사람 한 명에게 짧게 마음을 표현해 보세요.",
  토: "오늘 꼭 지킬 기준 한 가지를 메모해 보세요.",
  금: "할 일 목록에서 중요하지 않은 한 가지를 덜어내 보세요.",
  수: "잠시 멈추고 지금 마음을 세 문장으로 적어보세요.",
};

type Relation = "same" | "give" | "receive" | "control" | "adjust";

const relationCopy: Record<Relation, Pick<DailyFortune, "overall" | "workStudy" | "relationships">> = {
  same: {
    overall: "익숙한 방식이 힘을 얻는 흐름입니다. 속도를 높이기보다 방향이 맞는지 확인해 보세요.",
    workStudy: "잘하던 방법을 활용하되 한 번에 너무 많은 일을 잡지 않는 편이 좋습니다.",
    relationships: "내 생각이 분명해지는 만큼 상대의 관점도 한 번 더 들어보세요.",
  },
  give: {
    overall: "내 에너지를 바깥으로 쓰기 쉬운 흐름입니다. 중요한 곳에 힘을 먼저 배분해 보세요.",
    workStudy: "새 일을 벌이기보다 이미 시작한 일 하나를 끝까지 밀어보세요.",
    relationships: "도움을 주기 전에 상대가 원하는 방식인지 가볍게 물어보세요.",
  },
  receive: {
    overall: "주변의 도움과 아이디어를 받아들이기 좋은 흐름입니다. 열린 마음으로 선택지를 살펴보세요.",
    workStudy: "혼자 오래 고민하기보다 필요한 질문을 구체적으로 정리해 보세요.",
    relationships: "상대의 좋은 의도를 알아차리고 짧게라도 고마움을 표현해 보세요.",
  },
  control: {
    overall: "주도적으로 정리하고 결정하기 쉬운 흐름입니다. 무리하게 통제하려 하지는 않는지 살펴보세요.",
    workStudy: "우선순위를 정한 뒤 가장 영향이 큰 일부터 차분히 처리해 보세요.",
    relationships: "결론을 서두르기보다 서로 동의한 부분부터 확인해 보세요.",
  },
  adjust: {
    overall: "예상과 다른 흐름에 맞춰 균형을 조정하는 날입니다. 한 박자 쉬어가도 괜찮습니다.",
    workStudy: "계획이 달라지면 실패로 여기지 말고 가능한 범위를 다시 정해 보세요.",
    relationships: "바로 반응하기보다 상대의 말을 끝까지 들은 뒤 내 생각을 전해 보세요.",
  },
};

function isElement(value: unknown): value is Element {
  return typeof value === "string" && elements.includes(value as Element);
}

function relation(birth: Element, today: Element): Relation {
  if (birth === today) return "same";
  if (generates[birth] === today) return "give";
  if (generates[today] === birth) return "receive";
  if (controls[birth] === today) return "control";
  return "adjust";
}

function weakestElement(chart: SajuChart): Element {
  return elements.reduce((weakest, element) =>
    chart.elements[element] < chart.elements[weakest] ? element : weakest,
  elements[0]);
}

export function koreanDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function buildDailyTransit(date: string): DailyTransit {
  const chart = calculate({ date, time: "12:00", calendar: "solar", topic: "general" });
  const day = chart.pillars[2];
  return {
    date,
    dayPillar: {
      text: day.text,
      korean: day.korean,
      stemElement: day.stemElement,
      branchElement: day.branchElement,
    },
  };
}

export function calculateDailyFortune(chart: SajuChart, date: string): DailyFortune {
  const birthElement = chart?.dayMaster?.element;
  if (!isElement(birthElement) || !elements.every((element) => Number.isInteger(chart?.elements?.[element]))) {
    throw new Error("저장된 사주 계산값을 확인할 수 없습니다.");
  }
  const transit = buildDailyTransit(date);
  const todayElement = transit.dayPillar.stemElement;
  if (!isElement(todayElement)) throw new Error("오늘의 간지를 확인할 수 없습니다.");
  const copy = relationCopy[relation(birthElement, todayElement)];
  const weak = weakestElement(chart);
  return {
    headline: `${transit.dayPillar.korean}일 · ${headlineByElement[todayElement]}`,
    overall: copy.overall,
    workStudy: copy.workStudy,
    finance: financeByElement[todayElement],
    relationships: copy.relationships,
    action: actionByElement[weak],
  };
}
