import { NextResponse } from "next/server";
import { queryLeaderboard } from "@/services/database/scores";
import { clientIp, rateLimit } from "@/services/database/ratelimit";

export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`lb:${ip}`, 120, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "alltime" ? "alltime" : "weekly";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const cursor = Math.min(Math.max(Number(url.searchParams.get("cursor")) || 0, 0), 49);
  const q = (url.searchParams.get("q") ?? "").slice(0, 20).trim() || undefined;
  const playerId = url.searchParams.get("playerId") ?? undefined;

  try {
    const data = await queryLeaderboard({ scope, limit, cursor, q, playerId });
    return NextResponse.json({ scope, ...data });
  } catch (err) {
    console.error("leaderboard query failed", err);
    return NextResponse.json(
      { error: "The leaderboard is stuck in traffic. Try again shortly." },
      { status: 500 },
    );
  }
}
