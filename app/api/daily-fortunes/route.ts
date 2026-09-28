import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { generateDailyFortuneForUser } from "../../../lib/saju/daily-fortune-service";
import { koreanDate, shiftDate } from "../../../lib/saju/daily-fortune";

export const runtime = "nodejs";
export const maxDuration = 60;

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

type GetDependencies = { createClient: typeof createClient; now: () => Date };

export function createGet(deps: GetDependencies = { createClient, now: () => new Date() }) {
  return async function get(): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);
      const today = koreanDate(deps.now());
      const cutoff = shiftDate(today, -29);
      const result = await supabase.from("saju_daily_fortunes")
        .select("id, fortune_date, fortune, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("fortune_date", cutoff)
        .order("fortune_date", { ascending: false });
      if (result.error) return reply({ error: "오늘의 운세를 불러오지 못했습니다." }, 503);
      return reply({ today, items: result.data || [] }, 200);
    } catch {
      return reply({ error: "오늘의 운세를 확인하지 못했습니다." }, 503);
    }
  };
}

type PostDependencies = {
  createClient: typeof createClient;
  createAdminClient: typeof createAdminClient;
  generateForUser: typeof generateDailyFortuneForUser;
  now: () => Date;
};

export function createPost(deps: PostDependencies = {
  createClient,
  createAdminClient,
  generateForUser: generateDailyFortuneForUser,
  now: () => new Date(),
}) {
  return async function post(): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) return reply({ error: "Gemini API 키가 아직 설정되지 않았습니다." }, 503);
      const result = await deps.generateForUser({
        admin: deps.createAdminClient(),
        userId: user.id,
        fortuneDate: koreanDate(deps.now()),
        apiKey,
      });
      if (result.outcome === "no_reading") {
        return reply({ error: "저장된 사주가 없습니다. 먼저 사주 해석을 만들어 주세요.", code: "no_reading" }, 409);
      }
      if (result.outcome === "failed") return reply({ error: result.error, code: "generation_failed" }, 502);
      if (result.outcome === "in_progress") {
        return reply({ message: "오늘의 운세를 만들고 있습니다.", code: "in_progress" }, 202);
      }
      return reply({ outcome: result.outcome, fortune: result.fortune }, 200);
    } catch {
      return reply({ error: "오늘의 운세를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
    }
  };
}

export const GET = createGet();
export const POST = createPost();
