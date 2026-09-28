import type { SajuChart } from "../../../../lib/saju/chart";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { generateDailyFortuneForUser } from "../../../../lib/saju/daily-fortune-service";
import { koreanDate, shiftDate } from "../../../../lib/saju/daily-fortune";

export const runtime = "nodejs";
export const maxDuration = 60;

type Dependencies = {
  createAdminClient: typeof createAdminClient;
  generateForUser: typeof generateDailyFortuneForUser;
  now: () => Date;
};

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createCronGet(deps: Dependencies = {
  createAdminClient,
  generateForUser: generateDailyFortuneForUser,
  now: () => new Date(),
}) {
  return async function get(request: Request): Promise<Response> {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return reply({ error: "Unauthorized" }, 401);
    }
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return reply({ error: "Gemini API key is not configured." }, 503);

    try {
      const admin = deps.createAdminClient();
      const today = koreanDate(deps.now());
      const cutoff = shiftDate(today, -29);
      const cleanup = await admin.from("saju_daily_fortunes").delete().lt("fortune_date", cutoff);
      if (cleanup.error) throw new Error("retention cleanup failed");

      const configured = Number(process.env.DAILY_FORTUNE_BATCH_SIZE || "10");
      const batchSize = Number.isInteger(configured) ? Math.min(20, Math.max(1, configured)) : 10;
      const targets = await admin.rpc("list_saju_daily_fortune_targets", {
        p_fortune_date: today,
        p_limit: batchSize + 1,
      });
      if (targets.error) throw new Error("target lookup failed");
      const rows = (Array.isArray(targets.data) ? targets.data : []) as Array<{
        user_id: string;
        reading_id: string;
        chart: SajuChart;
      }>;
      const hasMore = rows.length > batchSize;
      const results = await Promise.all(rows.slice(0, batchSize).map((row) => deps.generateForUser({
        admin,
        userId: row.user_id,
        fortuneDate: today,
        apiKey,
        reading: { id: row.reading_id, chart: row.chart },
      })));
      const counts = results.reduce<Record<string, number>>((summary, result) => {
        summary[result.outcome] = (summary[result.outcome] || 0) + 1;
        return summary;
      }, {});
      const failed = counts.failed || 0;
      console.info("daily-fortune-cron", { date: today, targeted: results.length, counts, hasMore });
      return reply({ ok: failed === 0 && !hasMore, date: today, targeted: results.length, counts, hasMore }, failed || hasMore ? 207 : 200);
    } catch {
      return reply({ error: "Daily fortune cron failed." }, 500);
    }
  };
}

export const GET = createCronGet();
