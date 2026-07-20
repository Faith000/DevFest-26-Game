import crypto from "node:crypto";
import { getDb } from "./db";

export interface PlayerRow {
  id: string;
  display_name: string;
  avatar: string;
}

const NAME_RE = /^[\p{L}\p{N} _.\-']{2,20}$/u;

export function isValidDisplayName(name: string): boolean {
  return NAME_RE.test(name.trim());
}

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Creates a device-scoped identity. There is no sign-in anywhere: the token
 * stays on the player's device, display names may repeat, and identity for
 * leaderboard purposes is the (playerId, token) pair.
 */
export async function registerPlayer(input: {
  displayName: string;
  avatar: string;
}): Promise<{ id: string; token: string; displayName: string }> {
  const db = await getDb();
  const name = input.displayName.trim();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");
  await db.execute({
    sql: `INSERT INTO players (id, display_name, display_name_lower, avatar, token_hash, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, name, name.toLowerCase(), input.avatar, hashToken(token), new Date().toISOString()],
  });
  return { id, token, displayName: name };
}

/** Keeps the public profile in step with what the player last entered. */
export async function syncProfile(
  playerId: string,
  displayName: string,
  avatar: string,
): Promise<void> {
  const db = await getDb();
  const name = displayName.trim();
  await db.execute({
    sql: "UPDATE players SET display_name = ?, display_name_lower = ?, avatar = ? WHERE id = ?",
    args: [name, name.toLowerCase(), avatar, playerId],
  });
}

/** Returns the player only when id + bearer token match. */
export async function authenticate(
  playerId: string,
  token: string,
): Promise<PlayerRow | null> {
  if (!playerId || !token) return null;
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT id, display_name, avatar, token_hash FROM players WHERE id = ?",
    args: [playerId],
  });
  const row = res.rows[0] as unknown as
    | { id: string; display_name: string; avatar: string; token_hash: string }
    | undefined;
  if (!row) return null;
  const expected = Buffer.from(String(row.token_hash), "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }
  return {
    id: String(row.id),
    display_name: String(row.display_name),
    avatar: String(row.avatar),
  };
}
