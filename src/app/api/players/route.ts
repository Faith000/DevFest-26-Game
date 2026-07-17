import { NextResponse } from "next/server";
import { isValidAvatar, DEFAULT_AVATAR } from "@/config/avatars";
import { isValidDisplayName, registerPlayer } from "@/services/database/players";
import { clientIp, rateLimit } from "@/services/database/ratelimit";

/**
 * Issues a device identity for score submission. No sign-in, no email —
 * the client calls this silently the first time a score is submitted.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 12, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many new drivers from this connection. Try again later.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let body: { displayName?: unknown; avatar?: unknown };
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
  const avatar =
    typeof body.avatar === "string" && isValidAvatar(body.avatar) ? body.avatar : DEFAULT_AVATAR;

  const result = registerPlayer({ displayName, avatar });
  return NextResponse.json({
    playerId: result.id,
    token: result.token,
    displayName: result.displayName,
  });
}
