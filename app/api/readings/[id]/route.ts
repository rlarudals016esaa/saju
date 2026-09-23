import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

type Dependencies = { createClient: typeof createClient };
type Context = { params: Promise<{ id: string }> };

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function createDelete(deps: Dependencies = { createClient }) {
  return async function remove(_request: Request, context: Context): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);
      const { id } = await context.params;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return reply({ error: "결과 식별값이 올바르지 않습니다." }, 400);
      }
      const { data, error: deleteError } = await supabase.from("saju_readings")
        .delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
      if (deleteError) return reply({ error: "결과를 삭제하지 못했습니다." }, 503);
      if (!data) return reply({ error: "결과를 찾지 못했습니다." }, 404);
      return reply({ deleted: true }, 200);
    } catch {
      return reply({ error: "결과를 삭제하지 못했습니다." }, 503);
    }
  };
}

export const DELETE = createDelete();
