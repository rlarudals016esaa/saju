import type { SajuChart } from "./chart";
import { topicOrder, type SajuReading } from "./reading";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export class ReadingError extends Error {
  constructor(
    public readonly code: "timeout" | "quota" | "network" | "invalid_response",
    message: string,
  ) {
    super(message);
  }
}

const topicSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    action: { type: "string" },
  },
  required: ["title", "description", "action"],
};

const responseSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    tendency: { type: "string" },
    strength: { type: "string" },
    caution: { type: "string" },
    advice: {
      type: "object",
      properties: Object.fromEntries(topicOrder.map((topic) => [topic, topicSchema])),
      required: topicOrder,
    },
  },
  required: ["headline", "tendency", "strength", "caution", "advice"],
};

const forbiddenCertainty = /(?:반드시|무조건|틀림없이|확실히|100\s*%|절대로)\s*(?:성공|실패|합격|불합격|결혼|이별|발생|일어|된다|될|한다|할)/i;
const forbiddenFinancial = /(?:확정\s*수익|수익(?:이|을)?\s*보장|원금\s*보장|무위험|무조건\s*(?:돈|수익|재물)|(?:매수|매도|투자)\s*(?:하|해|하세요|하라)|(?:주식|코인|비트코인|부동산|종목|암호화폐|ETF|펀드).{0,20}(?:사세요|사라|매수|매도|투자)|(?:로또|복권|당첨|재물운).{0,20}(?:시기|내년|올해|된다|될|확실|예정)|(?:대출|빚)\s*(?:을|를)?\s*(?:받아|내서)\s*투자)/i;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function checkedText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new ReadingError("invalid_response", "AI 응답 형식이 올바르지 않습니다.");
  const text = value.trim();
  if (!text || text.length > max || forbiddenCertainty.test(text) || forbiddenFinancial.test(text)) {
    throw new ReadingError("invalid_response", "AI 응답 내용을 확인할 수 없습니다.");
  }
  return text;
}

export function validateReading(value: unknown, options: { allowLegacyFinance?: boolean } = {}): SajuReading {
  const root = record(value);
  const advice = record(root?.advice);
  if (!root || !advice) throw new ReadingError("invalid_response", "AI 응답 형식이 올바르지 않습니다.");

  const checkedAdvice = {} as SajuReading["advice"];
  const titles: Record<(typeof topicOrder)[number], string> = {
    career: "취업",
    finance: "금전",
    love: "연애",
    relationships: "인간관계",
    life: "삶의 흐름",
  };
  for (const topic of topicOrder) {
    const item = record(advice[topic]);
    if (!item && topic === "finance" && advice[topic] === undefined && options.allowLegacyFinance) {
      checkedAdvice.finance = {
        title: "금전",
        description: "이 결과는 금전 분야가 추가되기 전에 생성되어 금전 조언이 없습니다.",
        action: "금전 분야를 보려면 새 해석을 요청해 주세요.",
      };
      continue;
    }
    if (!item) throw new ReadingError("invalid_response", "분야별 조언이 빠졌습니다.");
    checkedAdvice[topic] = {
      title: titles[topic],
      description: checkedText(item.description, 360),
      action: checkedText(item.action, 200),
    };
  }

  return {
    headline: checkedText(root.headline, 80),
    tendency: checkedText(root.tendency, 400),
    strength: checkedText(root.strength, 280),
    caution: checkedText(root.caution, 280),
    advice: checkedAdvice,
  };
}

export async function generateReading(
  chart: SajuChart,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<SajuReading> {
  const chartSummary = {
    pillars: chart.pillars.map(({ label, korean, stemElement, branchElement }) => ({
      label, korean, stemElement, branchElement,
    })),
    dayMaster: chart.dayMaster,
    elements: chart.elements,
  };
  const prompt = [
    "당신은 전통 사주를 자기 성찰의 참고 자료로 쉽게 설명하는 한국어 작성자입니다.",
    "아래 값은 이미 계산된 사주입니다. 다시 계산하거나 생년월일을 추측하지 마세요.",
    "성향, 강점, 주의할 점과 취업·금전·연애·인간관계·삶의 흐름 조언을 구체적이지만 조심스럽게 써 주세요.",
    "금전 조언은 소비 기록, 예산, 저축 목표 등 스스로 점검할 습관에 집중하세요. 특정 투자상품 매매나 대출을 권하지 마세요.",
    "질병, 법률, 재산, 수익, 합격, 결혼, 미래 사건을 확정적으로 예측하지 마세요. 편견이나 공포를 유발하지 마세요.",
    "각 분야에 사용자가 직접 해볼 수 있는 작은 행동을 하나씩 제안하세요. 모든 문장은 한국어로 쓰세요.",
    `계산 자료: ${JSON.stringify(chartSummary)}`,
  ].join("\n");

  let response: Response;
  try {
    response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens: 3000,
          },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
  } catch (caught) {
    if (caught instanceof Error && (caught.name === "TimeoutError" || caught.name === "AbortError")) {
      throw new ReadingError("timeout", "해석 요청 시간이 초과되었습니다. 다시 시도해 주세요.");
    }
    throw new ReadingError("network", "해석 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (response.status === 429) {
    throw new ReadingError("quota", "해석 요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new ReadingError("network", "해석 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  try {
    const body: unknown = await response.json();
    const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!text) throw new Error("empty response");
    return validateReading(JSON.parse(text));
  } catch {
    throw new ReadingError("invalid_response", "해석 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
  }
}
