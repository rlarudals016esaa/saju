import type { SajuChart } from "./chart";
import { calculate } from "./chart";
import { GEMINI_MODEL, ReadingError } from "./ai-reading";

export type DailyFortune = {
  headline: string;
  overall: string;
  workStudy: string;
  finance: string;
  relationships: string;
  action: string;
};

export type DailyFortuneItem = {
  id: string;
  fortuneDate: string;
  fortune: DailyFortune;
  generatedAt: string;
};

export type DailyTransit = {
  date: string;
  dayPillar: Pick<SajuChart["pillars"][number], "text" | "korean" | "stemElement" | "branchElement">;
};

const responseSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    overall: { type: "string" },
    workStudy: { type: "string" },
    finance: { type: "string" },
    relationships: { type: "string" },
    action: { type: "string" },
  },
  required: ["headline", "overall", "workStudy", "finance", "relationships", "action"],
};

const forbiddenCertainty = /(?:반드시|무조건|틀림없이|확실히|100\s*%|절대로)\s*(?:성공|실패|합격|불합격|결혼|이별|발생|일어|된다|될|한다|할)/i;
const forbiddenFinancial = /(?:확정\s*수익|수익(?:이|을)?\s*보장|원금\s*보장|무위험|(?:매수|매도|투자)\s*(?:하|해|하세요|하라)|(?:주식|코인|비트코인|부동산|종목|암호화폐|ETF|펀드).{0,20}(?:사세요|사라|매수|매도|투자)|(?:로또|복권|당첨|재물운).{0,20}(?:시기|된다|될|확실)|(?:대출|빚)\s*(?:을|를)?\s*(?:받아|내서)\s*투자)/i;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function checkedText(value: unknown, max: number): string {
  if (typeof value !== "string") throw new ReadingError("invalid_response", "오늘의 운세 응답 형식이 올바르지 않습니다.");
  const text = value.trim();
  if (!text || text.length > max || forbiddenCertainty.test(text) || forbiddenFinancial.test(text)) {
    throw new ReadingError("invalid_response", "오늘의 운세 응답 내용을 확인할 수 없습니다.");
  }
  return text;
}

export function validateDailyFortune(value: unknown): DailyFortune {
  const root = record(value);
  if (!root) throw new ReadingError("invalid_response", "오늘의 운세 응답 형식이 올바르지 않습니다.");
  return {
    headline: checkedText(root.headline, 80),
    overall: checkedText(root.overall, 360),
    workStudy: checkedText(root.workStudy, 320),
    finance: checkedText(root.finance, 320),
    relationships: checkedText(root.relationships, 320),
    action: checkedText(root.action, 200),
  };
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

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
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

export function parseDailyFortuneItem(value: unknown): DailyFortuneItem | null {
  const item = record(value);
  if (!item || typeof item.id !== "string") return null;
  const fortuneDate = item.fortune_date ?? item.fortuneDate;
  const generatedAt = item.created_at ?? item.generatedAt;
  if (typeof fortuneDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fortuneDate)) return null;
  if (typeof generatedAt !== "string" || !Number.isFinite(Date.parse(generatedAt))) return null;
  try {
    return { id: item.id, fortuneDate, fortune: validateDailyFortune(item.fortune), generatedAt };
  } catch {
    return null;
  }
}

export async function generateDailyFortune(
  chart: SajuChart,
  fortuneDate: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<DailyFortune> {
  const transit = buildDailyTransit(fortuneDate);
  const chartSummary = {
    pillars: chart.pillars.map(({ label, korean, stemElement, branchElement }) => ({
      label, korean, stemElement, branchElement,
    })),
    dayMaster: chart.dayMaster,
    elements: chart.elements,
    birthTimeKnown: chart.birthTimeKnown !== false,
  };
  const prompt = [
    "당신은 전통 사주를 자기 성찰의 참고 자료로 쉽게 설명하는 한국어 작성자입니다.",
    "아래 출생 사주와 오늘의 간지는 이미 앱에서 계산했습니다. 다시 계산하거나 생년월일을 추측하지 마세요.",
    chart.birthTimeKnown === false
      ? "출생시간을 모르므로 시주가 제외된 세 기둥 자료입니다. 없는 시주를 추측하지 마세요."
      : "출생시간이 반영된 네 기둥 자료입니다.",
    "종합운, 일·학업운, 금전운, 관계운과 오늘 직접 해볼 작은 행동 하나를 조심스럽고 구체적으로 작성하세요.",
    "금전운은 소비 기록, 예산, 저축 같은 생활 습관에만 집중하고 특정 투자상품, 매매, 대출을 권하지 마세요.",
    "질병, 법률, 재산, 수익, 합격, 결혼, 이별이나 미래 사건을 확정적으로 예측하지 마세요.",
    `출생 사주 요약: ${JSON.stringify(chartSummary)}`,
    `오늘 자료: ${JSON.stringify(transit)}`,
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
            maxOutputTokens: 1800,
          },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
  } catch (caught) {
    if (caught instanceof Error && (caught.name === "TimeoutError" || caught.name === "AbortError")) {
      throw new ReadingError("timeout", "오늘의 운세 생성 시간이 초과되었습니다. 다시 시도해 주세요.");
    }
    throw new ReadingError("network", "오늘의 운세 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (response.status === 429) throw new ReadingError("quota", "오늘의 운세 요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (!response.ok) throw new ReadingError("network", "오늘의 운세 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");

  try {
    const body: unknown = await response.json();
    const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (!text) throw new Error("empty response");
    return validateDailyFortune(JSON.parse(text));
  } catch (caught) {
    if (caught instanceof ReadingError) throw caught;
    throw new ReadingError("invalid_response", "오늘의 운세 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
  }
}
