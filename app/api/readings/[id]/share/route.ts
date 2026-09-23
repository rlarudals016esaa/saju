import { UUID_PATTERN } from "../../../../../lib/saju/shared-reading";
import { createClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";

type Dependencies = { createClient: typeof createClient };
type Context = { params: Promise<{ id: string }> };

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function createPost(deps: Dependencies = { createClient }) {
  return async function post(request: Request, context: Context): Promise<Response> {
    try {
      const supabase = await deps.createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return reply({ error: "Google 로그인 후 이용해 주세요." }, 401);
      if (!request.headers.get("content-type")?.startsWith("application/json")) {
        return reply({ error: "요청 형식이 올바르지 않습니다." }, 415);
      }

      const { id } = await context.params;
      if (!UUID_PATTERN.test(id)) return reply({ error: "결과 식별값이 올바르지 않습니다." }, 400);

      const { data, error: shareError } = await supabase.rpc("create_saju_reading_share", {
        p_reading_id: id,
      });
      if (shareError) {
        const missing = typeof shareError === "object" && "code" in shareError && shareError.code === "P0002";
        return reply({ error: missing
          ? "공유할 결과를 찾지 못했습니다."
          : "공유 링크를 만들지 못했습니다. 다시 시도해 주세요." }, missing ? 404 : 503);
      }
      if (typeof data !== "string" || !UUID_PATTERN.test(data)) {
        return reply({ error: "공유할 결과를 찾지 못했거나 공유 링크를 만들 수 없습니다." }, 404);
      }
      return reply({ token: data, path: `/share/${data}` }, 200);
    } catch {
      return reply({ error: "공유 링크를 만들지 못했습니다. 다시 시도해 주세요." }, 503);
    }
  };
}

export const POST = createPost();
