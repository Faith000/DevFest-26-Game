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
export function registerPlayer(input: {
  displayName: string;
  avatar: string;
}): { id: string; token: string; displayName: string } {
  const db = getDb();
  const name = input.displayName.trim();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(
    `INSERT INTO players (id, display_name, display_name_lower, avatar, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, name, name.toLowerCase(), input.avatar, hashToken(token), new Date().toISOString());
  return { id, token, displayName: name };
}

/** Keeps the public profile in step with what the player last entered. */
export function syncProfile(playerId: string, displayName: string, avatar: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE players SET display_name = ?, display_name_lower = ?, avatar = ? WHERE id = ?",
  ).run(displayName.trim(), displayName.trim().toLowerCase(), avatar, playerId);
}

/** Returns the player only when id + bearer token match. */
export function authenticate(playerId: string, token: string): PlayerRow | null {
  if (!playerId || !token) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, display_name, avatar, token_hash FROM players WHERE id = ?")
    .get(playerId) as (PlayerRow & { token_hash: string }) | undefined;
  if (!row) return null;
  const expected = Buffer.from(row.token_hash, "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }
  return { id: row.id, display_name: row.display_name, avatar: row.avatar };
}
