import crypto from "node:crypto";
import { getDb } from "./db";

export interface PlayerRow {
  id: string;
  display_name: string;
  track: string;
  avatar: string;
}

const NAME_RE = /^[\p{L}\p{N} _.\-']{2,20}$/u;

export function isValidDisplayName(name: string): boolean {
  return NAME_RE.test(name.trim());
}

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export function registerPlayer(input: {
  displayName: string;
  track: string;
  avatar: string;
}): { ok: true; id: string; token: string; displayName: string } | { ok: false; code: "name_taken" } {
  const db = getDb();
  const name = input.displayName.trim();
  const exists = db
    .prepare("SELECT id FROM players WHERE display_name_lower = ?")
    .get(name.toLowerCase());
  if (exists) return { ok: false, code: "name_taken" };

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(
    `INSERT INTO players (id, display_name, display_name_lower, track, avatar, token_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, name, name.toLowerCase(), input.track, input.avatar, hashToken(token), new Date().toISOString());
  return { ok: true, id, token, displayName: name };
}

export function renamePlayer(
  playerId: string,
  newName: string,
): { ok: true; displayName: string } | { ok: false; code: "name_taken" } {
  const db = getDb();
  const name = newName.trim();
  const clash = db
    .prepare("SELECT id FROM players WHERE display_name_lower = ? AND id != ?")
    .get(name.toLowerCase(), playerId);
  if (clash) return { ok: false, code: "name_taken" };
  db.prepare(
    "UPDATE players SET display_name = ?, display_name_lower = ? WHERE id = ?",
  ).run(name, name.toLowerCase(), playerId);
  return { ok: true, displayName: name };
}

/** Returns the player only when id + bearer token match. */
export function authenticate(playerId: string, token: string): PlayerRow | null {
  if (!playerId || !token) return null;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, display_name, track, avatar, token_hash FROM players WHERE id = ?",
    )
    .get(playerId) as (PlayerRow & { token_hash: string }) | undefined;
  if (!row) return null;
  const expected = Buffer.from(row.token_hash, "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }
  return { id: row.id, display_name: row.display_name, track: row.track, avatar: row.avatar };
}
