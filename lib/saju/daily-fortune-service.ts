import type { SupabaseClient } from "@supabase/supabase-js";
import type { SajuChart } from "./chart";
import { GEMINI_MODEL, ReadingError } from "./ai-reading";
import { generateDailyFortune, type DailyFortune } from "./daily-fortune";

type Generator = (chart: SajuChart, date: string, key: string) => Promise<DailyFortune>;

export type DailyFortuneGenerationResult = {
  outcome: "created" | "existing" | "in_progress" | "no_reading" | "failed";
  fortune?: DailyFortune;
  error?: string;
};

function message(caught: unknown): string {
  if (caught instanceof ReadingError) return caught.message;
  return "오늘의 운세를 만들지 못했습니다.";
}

export async function generateDailyFortuneForUser(options: {
  admin: SupabaseClient;
  userId: string;
  fortuneDate: string;
  apiKey: string;
  reading?: { id: string; chart: SajuChart };
  generator?: Generator;
}): Promise<DailyFortuneGenerationResult> {
  const { admin, userId, fortuneDate, apiKey } = options;
  let reading = options.reading;
  if (!reading) {
    const latest = await admin.from("saju_readings")
      .select("id, chart")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error("최근 사주를 조회하지 못했습니다.");
    if (!latest.data) return { outcome: "no_reading" };
    reading = { id: latest.data.id as string, chart: latest.data.chart as SajuChart };
  }

  const claim = await admin.rpc("claim_saju_daily_fortune", {
    p_user_id: userId,
    p_reading_id: reading.id,
    p_fortune_date: fortuneDate,
  });
  if (claim.error) throw new Error("오늘의 운세 작업을 시작하지 못했습니다.");
  const claimed = Array.isArray(claim.data) ? claim.data[0]?.claimed === true : false;
  if (!claimed) {
    const existing = await admin.from("saju_daily_fortunes")
      .select("status, fortune")
      .eq("user_id", userId)
      .eq("fortune_date", fortuneDate)
      .maybeSingle();
    if (existing.error) throw new Error("오늘의 운세 상태를 확인하지 못했습니다.");
    if (existing.data?.status === "completed") {
      return { outcome: "existing", fortune: existing.data.fortune as DailyFortune };
    }
    return { outcome: "in_progress" };
  }

  try {
    const fortune = await (options.generator || generateDailyFortune)(reading.chart, fortuneDate, apiKey);
    const completed = await admin.from("saju_daily_fortunes")
      .update({
        status: "completed",
        fortune,
        model: GEMINI_MODEL,
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("fortune_date", fortuneDate)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (completed.error || !completed.data) throw new Error("오늘의 운세를 저장하지 못했습니다.");
    return { outcome: "created", fortune };
  } catch (caught) {
    const error = message(caught);
    await admin.from("saju_daily_fortunes")
      .update({ status: "failed", error_code: caught instanceof ReadingError ? caught.code : "unknown", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("fortune_date", fortuneDate)
      .eq("status", "pending");
    return { outcome: "failed", error };
  }
}
