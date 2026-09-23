import { calculate, type SajuChart, type SajuInput } from "./chart";
import type { ElementName } from "./elements";

const generates: Record<ElementName, ElementName> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const controls: Record<ElementName, ElementName> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

const stems: Record<ElementName, string> = {
  목: "갑·을",
  화: "병·정",
  토: "무·기",
  금: "경·신",
  수: "임·계",
};

export type AnnualFlowItem = {
  year: number;
  label: "지난해" | "올해" | "내년";
  pillar: string;
  element: ElementName;
  theme: string;
  description: string;
};

export type RelationType = {
  element: ElementName;
  stems: string;
  description: string;
};

export type RelationGuide = {
  support: RelationType;
  tension: RelationType;
};

export type FinanceTiming = {
  dayElement: ElementName;
  wealthElement: ElementName;
  years: number[];
};

function checkedElement(value: string): ElementName {
  if (!(value in generates)) throw new Error("오행 관계를 찾지 못했습니다.");
  return value as ElementName;
}

function flowTheme(self: ElementName, annual: ElementName) {
  if (self === annual)
    return { theme: "자기 점검", description: "내가 중요하게 여기는 기준을 다시 살펴보세요." };
  if (generates[annual] === self)
    return { theme: "배움과 도움", description: "새로 배우거나 도움을 받을 기회를 살펴보세요." };
  if (generates[self] === annual)
    return { theme: "표현과 실행", description: "생각을 작은 행동으로 옮길 방법을 찾아보세요." };
  if (controls[self] === annual)
    return { theme: "선택과 정리", description: "지금 집중할 일과 내려놓을 일을 구분해 보세요." };
  return { theme: "기준과 조율", description: "바깥의 기대와 내 속도를 함께 살펴보세요." };
}

function koreanYear(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
}

function annualPillar(year: number) {
  // Compare the representative annual pillar after Ipchun, not a specific month's fortune.
  const input: SajuInput = {
    date: `${year}-06-15`,
    time: "12:00",
    calendar: "solar",
    topic: "general",
  };
  return calculate(input).pillars[0];
}

export function buildAnnualFlow(chart: SajuChart, now = new Date()): AnnualFlowItem[] {
  const self = checkedElement(chart.dayMaster.element);
  const currentYear = koreanYear(now);
  const labels: AnnualFlowItem["label"][] = ["지난해", "올해", "내년"];

  return labels.map((label, index) => {
    const year = currentYear + index - 1;
    const yearPillar = annualPillar(year);
    const element = checkedElement(yearPillar.stemElement);
    return {
      year,
      label,
      pillar: yearPillar.korean,
      element,
      ...flowTheme(self, element),
    };
  });
}

export function buildFinanceTiming(chart: SajuChart, now = new Date()): FinanceTiming {
  const dayElement = checkedElement(chart.dayMaster.element);
  const wealthElement = controls[dayElement];
  const currentYear = koreanYear(now);
  const matchingYears: number[] = [];

  for (let year = currentYear; year < currentYear + 10; year++) {
    if (checkedElement(annualPillar(year).stemElement) === wealthElement) matchingYears.push(year);
  }

  if (matchingYears.length === 0) throw new Error("금전 시기 해석의 연도를 찾지 못했습니다.");
  const years = [matchingYears[0]];
  if (matchingYears[1] === matchingYears[0] + 1) years.push(matchingYears[1]);
  return { dayElement, wealthElement, years };
}

export function buildRelationGuide(chart: SajuChart): RelationGuide {
  const self = checkedElement(chart.dayMaster.element);
  const supportElement = checkedElement(
    Object.keys(generates).find((element) => generates[element as ElementName] === self) || "",
  );
  const tensionElement = checkedElement(
    Object.keys(controls).find((element) => controls[element as ElementName] === self) || "",
  );

  return {
    support: {
      element: supportElement,
      stems: stems[supportElement],
      description: `전통 오행의 상생 관계: ${supportElement} → ${self}. 서로에게 편안한 지점이 무엇인지 대화해 보세요.`,
    },
    tension: {
      element: tensionElement,
      stems: stems[tensionElement],
      description: `전통 오행의 상극 관계: ${tensionElement} → ${self}. 생각이 다를 때 표현 방식부터 맞춰보세요.`,
    },
  };
}
