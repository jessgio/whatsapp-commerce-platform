import { NextResponse } from "next/server";
import { dispatchDueCampaigns } from "@/lib/campaign-dispatch";

/** Allow larger segment sends within Fluid Compute limits. */
export const maxDuration = 300;

/**
 * Vercel Cron worker — dispatches scheduled campaigns that are due.
 * Configure CRON_SECRET and vercel.json crons entry.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/campaigns] CRON_SECRET is not configured");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { processed, results } = await dispatchDueCampaigns();
    console.info("[cron/campaigns] done", {
      processed,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
    return NextResponse.json({ ok: true, processed, results });
  } catch (e) {
    console.error("[cron/campaigns] failed", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Cron dispatch failed",
      },
      { status: 500 },
    );
  }
}
