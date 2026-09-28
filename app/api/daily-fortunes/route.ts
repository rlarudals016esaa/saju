import { calculate, InputError } from "../../../lib/saju/chart";
import { calculateDailyFortune, buildDailyTransit, koreanDate } from "../../../lib/saju/daily-fortune";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

type Dependencies = { createClient: typeof createClient; now: () => Date };

export function createPost(deps: Dependencies = { createClient, now: () => new Date() }) {
  return async function post(request: Request): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);
      if (!request.headers.get("content-type")?.startsWith("application/json")) {
        return reply({ error: "요청 형식을 확인해 주세요." }, 415);
      }

      let chart;
      try {
        const raw = await request.text();
        if (raw.length > 128) return reply({ error: "입력 내용이 너무 깁니다." }, 413);
        const body: unknown = JSON.parse(raw);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("생년월일을 입력해 주세요.");
        chart = calculate({
          date: (body as Record<string, unknown>).date as string,
          time: "",
          unknownTime: true,
          calendar: "solar",
          topic: "general",
        });
      } catch (caught) {
        return reply({ error: caught instanceof InputError ? caught.message : "생년월일을 확인해 주세요." }, 400);
      }
      const today = koreanDate(deps.now());
      return reply({
        today,
        transit: buildDailyTransit(today),
        fortune: calculateDailyFortune(chart, today),
      }, 200);
    } catch {
      return reply({ error: "오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
    }
  };
}

export const POST = createPost();
