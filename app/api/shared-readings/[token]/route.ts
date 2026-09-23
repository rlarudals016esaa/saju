import { parseSharedReading, UUID_PATTERN } from "../../../../lib/saju/shared-reading";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

type Dependencies = { createClient: typeof createClient };
type Context = { params: Promise<{ token: string }> };

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

export function createGet(deps: Dependencies = { createClient }) {
  return async function get(_request: Request, context: Context): Promise<Response> {
    try {
      const { token } = await context.params;
      if (!UUID_PATTERN.test(token)) return reply({ error: "공유 결과를 찾을 수 없습니다." }, 404);

      const supabase = await deps.createClient();
      const { data, error } = await supabase.rpc("get_saju_reading_share", { p_token: token });
      if (error) return reply({ error: "공유 결과를 불러오지 못했습니다." }, 503);
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return reply({ error: "공유 결과를 찾을 수 없습니다." }, 404);
      const result = parseSharedReading(row);
      if (!result) return reply({ error: "공유 결과의 형식을 확인하지 못했습니다." }, 502);
      return reply(result, 200);
    } catch {
      return reply({ error: "공유 결과를 불러오지 못했습니다." }, 503);
    }
  };
}

export const GET = createGet();
