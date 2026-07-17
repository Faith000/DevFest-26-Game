import { NextResponse } from "next/server";
import { getDb } from "@/services/database/db";
import { clientIp, rateLimit } from "@/services/database/ratelimit";

const KNOWN_EVENTS = new Set([
  "landing_viewed",
  "game_started",
  "vehicle_selected",
  "run_started",
  "run_completed",
  "run_failed",
  "personal_best_achieved",
  "score_submission_started",
  "score_submitted",
  "leaderboard_viewed",
  "play_again_clicked",
  "result_shared",
  "devfest_link_clicked",
]);

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`analytics:${ip}`, 120, 60 * 1000)) {
    return new NextResponse(null, { status: 204 }); // silently drop, never error
  }
  try {
    const body = (await req.json()) as { event?: unknown; params?: unknown };
    if (typeof body.event === "string" && KNOWN_EVENTS.has(body.event)) {
      const params = JSON.stringify(body.params ?? {}).slice(0, 500);
      getDb()
        .prepare("INSERT INTO analytics_events (event, params, created_at) VALUES (?, ?, ?)")
        .run(body.event, params, new Date().toISOString());
    }
  } catch {
    /* analytics must never fail loudly */
  }
  return new NextResponse(null, { status: 204 });
}
