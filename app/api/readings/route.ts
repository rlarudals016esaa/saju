import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

type Dependencies = { createClient: typeof createClient };

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function createGet(deps: Dependencies = { createClient }) {
  return async function get(request: Request): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);

      const pageText = new URL(request.url).searchParams.get("page") || "0";
      if (!/^\d{1,4}$/.test(pageText)) return reply({ error: "목록 페이지가 올바르지 않습니다." }, 400);
      const page = Number(pageText);
      const start = page * 10;
      const { data, error: queryError, count } = await supabase.from("saju_readings")
        .select("id, chart, reading, model, schema_version, created_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + 9);
      if (queryError) return reply({ error: "저장된 결과를 불러오지 못했습니다." }, 503);
      return reply({ items: data || [], nextPage: (count || 0) > start + 10 ? page + 1 : null }, 200);
    } catch {
      return reply({ error: "결과 목록을 확인하지 못했습니다." }, 503);
    }
  };
}

export const GET = createGet();
