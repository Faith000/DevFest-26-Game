import { NextResponse } from "next/server";
import { isValidAvatar, DEFAULT_AVATAR } from "@/config/avatars";
import { isValidTrack, DEVFEST_TRACKS } from "@/config/tracks";
import {
  authenticate,
  isValidDisplayName,
  registerPlayer,
  renamePlayer,
} from "@/services/database/players";
import { clientIp, rateLimit } from "@/services/database/ratelimit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many new drivers from this connection. Try again later.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let body: { displayName?: unknown; track?: unknown; avatar?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!isValidDisplayName(displayName)) {
    return NextResponse.json(
      { error: "Display names need 2–20 letters, numbers or basic punctuation.", code: "bad_name" },
      { status: 400 },
    );
  }
  const track =
    typeof body.track === "string" && isValidTrack(body.track) ? body.track : DEVFEST_TRACKS[10];
  const avatar =
    typeof body.avatar === "string" && isValidAvatar(body.avatar) ? body.avatar : DEFAULT_AVATAR;

  const result = registerPlayer({ displayName, track, avatar });
  if (!result.ok) {
    return NextResponse.json(
      { error: "That display name is taken.", code: "name_taken" },
      { status: 409 },
    );
  }
  return NextResponse.json({
    playerId: result.id,
    token: result.token,
    displayName: result.displayName,
  });
}

/** Rename a claimed handle. The leaderboard always shows the current name. */
export async function PATCH(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`rename:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many name changes. Try again later.", code: "rate_limited" },
      { status: 429 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  let body: { playerId?: unknown; displayName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const player = authenticate(playerId, token);
  if (!player) {
    return NextResponse.json(
      { error: "Sign in again to change your name.", code: "unauthorized" },
      { status: 401 },
    );
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!isValidDisplayName(displayName)) {
    return NextResponse.json(
      { error: "Display names need 2–20 letters, numbers or basic punctuation.", code: "bad_name" },
      { status: 400 },
    );
  }

  const result = renamePlayer(player.id, displayName);
  if (!result.ok) {
    return NextResponse.json(
      { error: "That display name is taken.", code: "name_taken" },
      { status: 409 },
    );
  }
  return NextResponse.json({ playerId: player.id, displayName: result.displayName });
}
