import { NextResponse } from "next/server";
import type { RunStats } from "@/types/game";
import {
  authenticate,
  isValidDisplayName,
  syncProfile,
} from "@/services/database/players";
import { isValidAvatar } from "@/config/avatars";
import { clientIp, rateLimit } from "@/services/database/ratelimit";
import { validateRun } from "@/services/database/validation";
import {
  countRecentSubmissions,
  findExistingSession,
  playerRanks,
  storeRun,
} from "@/services/database/scores";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`scores-ip:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json(
      { error: "Slow down — too many submissions.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  let body: {
    playerId?: unknown;
    run?: unknown;
    claimedScore?: unknown;
    profile?: { displayName?: unknown; avatar?: unknown };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const player = authenticate(playerId, token);
  if (!player) {
    return NextResponse.json(
      { error: "Sign in again to submit scores.", code: "unauthorized" },
      { status: 401 },
    );
  }

  if (!rateLimit(`scores-player:${player.id}`, 6, 60 * 1000)) {
    return NextResponse.json(
      { error: "Catch your breath — submissions are rate limited.", code: "rate_limited" },
      { status: 429 },
    );
  }
  // sustained-volume guard, DB-backed
  if (countRecentSubmissions(player.id, 60 * 60 * 1000) > 80) {
    return NextResponse.json(
      { error: "Unusual submission volume — try again later.", code: "rate_limited" },
      { status: 429 },
    );
  }

  // keep the public profile in step with the name entered before driving
  const nextName =
    typeof body.profile?.displayName === "string" ? body.profile.displayName.trim() : "";
  const nextAvatar =
    typeof body.profile?.avatar === "string" && isValidAvatar(body.profile.avatar)
      ? body.profile.avatar
      : player.avatar;
  if (isValidDisplayName(nextName) && (nextName !== player.display_name || nextAvatar !== player.avatar)) {
    syncProfile(player.id, nextName, nextAvatar);
  }

  const run = body.run as RunStats | undefined;
  if (!run || typeof run !== "object") {
    return NextResponse.json({ error: "Missing run data." }, { status: 400 });
  }

  // duplicate submissions are idempotent, never double-counted
  const existing = findExistingSession(run.sessionId ?? "");
  if (existing) {
    const ranks = playerRanks(player.id);
    return NextResponse.json({
      accepted: existing.status !== "rejected",
      status: existing.status,
      score: existing.score,
      weeklyRank: ranks.weeklyRank,
      allTimeRank: ranks.allTimeRank,
      weekId: existing.weekId,
      duplicate: true,
    });
  }

  const claimedScore = typeof body.claimedScore === "number" ? body.claimedScore : -1;
  const outcome = validateRun(run, claimedScore);
  if (outcome.verdict === "rejected") {
    return NextResponse.json(
      { error: `Run rejected: ${outcome.reason}.`, code: "rejected" },
      { status: 422 },
    );
  }

  const stored = storeRun(player.id, run, outcome.score, outcome.verdict);
  const ranks = playerRanks(player.id);
  return NextResponse.json({
    accepted: true,
    status: stored.status,
    score: stored.score,
    weeklyRank: ranks.weeklyRank,
    allTimeRank: ranks.allTimeRank,
    weekId: stored.weekId,
  });
}
