import { calculate, InputError, type SajuInput } from "../../../lib/saju/chart";
import { generateReading, GEMINI_MODEL, ReadingError } from "../../../lib/saju/ai-reading";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

const limits = new Map<string, { count: number; until: number }>();

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function limited(request: Request): boolean {
  const client = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
  const now = Date.now();
  const bucket = limits.get(client);
  if (!bucket || bucket.until <= now) {
    limits.set(client, { count: 1, until: now + 60_000 });
    return false;
  }
  bucket.count++;
  if (limits.size > 1000) {
    for (const [key, value] of limits) if (value.until <= now) limits.delete(key);
  }
  return bucket.count > 6;
}

type Dependencies = {
  createClient: typeof createClient;
  generateReading: typeof generateReading;
};

export function createPost(deps: Dependencies = { createClient, generateReading }) {
  return async function post(request: Request): Promise<Response> {
    let supabase;
    try {
      supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요.", code: "unauthorized" }, 401);
      if (!request.headers.get("content-type")?.startsWith("application/json")) {
        return reply({ error: "요청 형식이 올바르지 않습니다.", code: "invalid_input" }, 415);
      }
      if (limited(request)) {
        return reply({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", code: "quota" }, 429);
      }

      const key = process.env.GEMINI_API_KEY?.trim();
      if (!key) return reply({ error: "Gemini API 키가 아직 설정되지 않았습니다.", code: "missing_key" }, 503);

      let chart;
      let requestId: string;
      try {
        const raw = await request.text();
        if (raw.length > 256) return reply({ error: "입력 내용이 너무 깁니다.", code: "invalid_input" }, 413);
        const body: unknown = JSON.parse(raw);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
        const fields = body as Record<string, unknown>;
        if (typeof fields.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.requestId)) {
          throw new InputError("요청 식별값을 확인해 주세요.");
        }
        requestId = fields.requestId;
        const input: SajuInput = {
          date: fields.date as string,
          time: fields.time as string,
          unknownTime: fields.unknownTime === true,
          calendar: "solar",
          topic: "general",
        };
        chart = calculate(input);
      } catch (caught) {
        return reply({
          error: caught instanceof InputError ? caught.message : "생년월일과 출생시간 선택을 확인해 주세요.",
          code: "invalid_input",
        }, 400);
      }

      const previous = await supabase.from("saju_readings")
        .select("id, chart, reading, created_at")
        .eq("user_id", user.id).eq("request_id", requestId).maybeSingle();
      if (previous.error) {
        return reply({ error: "결과 저장소를 사용할 수 없습니다. 설정을 확인해 주세요.", code: "database_unavailable" }, 503);
      }
      if (previous.data) {
        return reply({ id: previous.data.id, chart: previous.data.chart, reading: previous.data.reading,
          generatedAt: previous.data.created_at, saved: true }, 200);
      }

      try {
        const reading = await deps.generateReading(chart, key);
        const inserted = await supabase.from("saju_readings")
          .insert({ user_id: user.id, request_id: requestId, chart, reading,
            model: GEMINI_MODEL, schema_version: 1 })
          .select("id, created_at").single();
        if (inserted.error || !inserted.data) {
          return reply({ chart, reading, generatedAt: new Date().toISOString(), saved: false,
            error: "해석은 완료됐지만 데이터베이스에 저장하지 못했습니다. 새로고침하면 사라질 수 있습니다." }, 200);
        }
        return reply({ id: inserted.data.id, chart, reading,
          generatedAt: inserted.data.created_at, saved: true }, 200);
      } catch (caught) {
        if (caught instanceof ReadingError) {
          return reply({ error: caught.message, code: caught.code }, caught.code === "quota" ? 429 : 502);
        }
        return reply({ error: "해석 결과를 만들지 못했습니다. 다시 시도해 주세요.", code: "unknown" }, 502);
      }
    } catch {
      return reply({ error: "로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.", code: "auth_unavailable" }, 503);
    }
  };
}

export const POST = createPost();
