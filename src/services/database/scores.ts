import crypto from "node:crypto";
import type { RunStats } from "@/types/game";
import type { LeaderboardEntry, VerificationStatus } from "@/types/leaderboard";
import type { VehicleId } from "@/types/game";
import { weekIdFor, weekStart } from "@/utils/weeks";
import { getDb } from "./db";

const TIE_ORDER =
  "score DESC, remaining_time DESC, collisions ASC, near_misses DESC, created_at ASC";
const TIE_ORDER_B =
  "b.score DESC, b.remaining_time DESC, b.collisions ASC, b.near_misses DESC, b.created_at ASC";

function ensureWeek(weekId: string): void {
  const db = getDb();
  const start = weekStart(new Date());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  db.prepare(
    "INSERT OR IGNORE INTO leaderboard_weeks (id, starts_at, ends_at) VALUES (?, ?, ?)",
  ).run(weekId, start.toISOString(), end.toISOString());
}

export interface StoredSubmission {
  status: VerificationStatus;
  score: number;
  weekId: string;
  duplicate: boolean;
}

export function findExistingSession(sessionId: string): StoredSubmission | null {
  const db = getDb();
  const row = db
    .prepare("SELECT verification_status, score, week_id FROM game_sessions WHERE id = ?")
    .get(sessionId) as { verification_status: VerificationStatus; score: number; week_id: string } | undefined;
  if (!row) return null;
  return { status: row.verification_status, score: row.score, weekId: row.week_id, duplicate: true };
}

/** true when b beats a under the published tie-break rules */
function beats(
  b: { score: number; remaining_time: number; collisions: number; near_misses: number },
  a: { score: number; remaining_time: number; collisions: number; near_misses: number },
): boolean {
  if (b.score !== a.score) return b.score > a.score;
  if (b.remaining_time !== a.remaining_time) return b.remaining_time > a.remaining_time;
  if (b.collisions !== a.collisions) return b.collisions < a.collisions;
  if (b.near_misses !== a.near_misses) return b.near_misses > a.near_misses;
  return false; // earlier submission wins exact ties
}

export function storeRun(
  playerId: string,
  run: RunStats,
  score: number,
  status: Exclude<VerificationStatus, "rejected">,
): StoredSubmission {
  const db = getDb();
  const weekId = weekIdFor(new Date());
  ensureWeek(weekId);
  const createdAt = new Date().toISOString();
  const collectibles =
    run.collectibles.star + run.collectibles.codeToken + run.collectibles.wifi + run.collectibles.badge;

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO game_sessions
        (id, player_id, started_at, ended_at, game_version, scoring_version, vehicle_id,
         result, distance, remaining_time, collisions, near_misses, dodges,
         stars, code_tokens, wifi, badges, highest_combo, combo_score, score,
         week_id, verification_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      run.sessionId, playerId, run.startedAt, run.endedAt, run.gameVersion, run.scoringVersion,
      run.vehicleId, run.result, run.distance, run.remainingTime, run.collisions, run.nearMisses,
      run.dodges, run.collectibles.star, run.collectibles.codeToken, run.collectibles.wifi,
      run.collectibles.badge, run.highestCombo, run.comboScore, score, weekId, status, createdAt,
    );

    // only verified runs occupy the public boards, one row per player per week
    if (status !== "verified") return;

    const candidate = {
      score,
      remaining_time: run.remainingTime,
      collisions: run.collisions,
      near_misses: run.nearMisses,
    };
    const existing = db
      .prepare(
        "SELECT id, score, remaining_time, collisions, near_misses FROM leaderboard_scores WHERE player_id = ? AND week_id = ?",
      )
      .get(playerId, weekId) as
      | { id: string; score: number; remaining_time: number; collisions: number; near_misses: number }
      | undefined;

    if (existing && !beats(candidate, existing)) return;

    if (existing) {
      db.prepare("DELETE FROM leaderboard_scores WHERE id = ?").run(existing.id);
    }
    db.prepare(
      `INSERT INTO leaderboard_scores
        (id, player_id, session_id, week_id, score, distance, remaining_time,
         collisions, near_misses, collectibles, highest_combo, vehicle_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(), playerId, run.sessionId, weekId, score, run.distance,
      run.remainingTime, run.collisions, run.nearMisses, collectibles, run.highestCombo,
      run.vehicleId, createdAt,
    );
  });
  insert();

  return { status, score, weekId, duplicate: false };
}

/* ------------------------------ queries ------------------------------- */

interface RankedRow {
  player_id: string;
  display_name: string;
  avatar: string;
  track: string;
  vehicle_id: string;
  score: number;
  remaining_time: number;
  collisions: number;
  near_misses: number;
  created_at: string;
  rnk: number;
}

/** deduped (best-per-player) ranked set for a scope, as a CTE */
function scopedCte(scope: "weekly" | "alltime"): string {
  const filter = scope === "weekly" ? "WHERE ls.week_id = @weekId" : "";
  return `
    WITH best AS (
      SELECT ls.*, ROW_NUMBER() OVER (PARTITION BY ls.player_id ORDER BY ${TIE_ORDER}) AS rn
      FROM leaderboard_scores ls
      ${filter}
    ),
    ranked AS (
      SELECT b.*, p.display_name, p.avatar, p.track,
             ROW_NUMBER() OVER (ORDER BY ${TIE_ORDER_B}) AS rnk
      FROM best b JOIN players p ON p.id = b.player_id
      WHERE b.rn = 1
    )
  `;
}

function toEntry(r: RankedRow): LeaderboardEntry {
  return {
    rank: r.rnk,
    playerId: r.player_id,
    displayName: r.display_name,
    avatar: r.avatar,
    preferredTrack: r.track,
    vehicleId: r.vehicle_id as VehicleId,
    score: r.score,
    remainingTime: r.remaining_time,
    collisions: r.collisions,
    nearMisses: r.near_misses,
    createdAt: r.created_at,
  };
}

export function queryLeaderboard(opts: {
  scope: "weekly" | "alltime";
  limit: number;
  cursor: number;
  q?: string;
  playerId?: string;
}): {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
  weekId: string;
  nextCursor: number | null;
} {
  const db = getDb();
  const weekId = weekIdFor(new Date());
  ensureWeek(weekId);
  const cte = scopedCte(opts.scope);
  const params = { weekId };

  const total = (
    db.prepare(`${cte} SELECT COUNT(*) AS n FROM ranked`).get(params) as { n: number }
  ).n;

  let rows: RankedRow[];
  if (opts.q) {
    rows = db
      .prepare(
        `${cte} SELECT * FROM ranked WHERE instr(lower(display_name), lower(@q)) > 0 ORDER BY rnk LIMIT @limit OFFSET @cursor`,
      )
      .all({ ...params, q: opts.q, limit: opts.limit, cursor: opts.cursor }) as RankedRow[];
  } else {
    rows = db
      .prepare(`${cte} SELECT * FROM ranked ORDER BY rnk LIMIT @limit OFFSET @cursor`)
      .all({ ...params, limit: opts.limit, cursor: opts.cursor }) as RankedRow[];
  }

  let me: LeaderboardEntry | null = null;
  if (opts.playerId) {
    const meRow = db
      .prepare(`${cte} SELECT * FROM ranked WHERE player_id = @playerId`)
      .get({ ...params, playerId: opts.playerId }) as RankedRow | undefined;
    if (meRow) me = toEntry(meRow);
  }

  const consumed = opts.cursor + rows.length;
  return {
    entries: rows.map(toEntry),
    me,
    total,
    weekId,
    nextCursor: !opts.q && consumed < Math.min(total, 50) ? consumed : null,
  };
}

export function playerRanks(playerId: string): { weeklyRank: number | null; allTimeRank: number | null } {
  const db = getDb();
  const weekId = weekIdFor(new Date());
  const get = (scope: "weekly" | "alltime"): number | null => {
    const row = db
      .prepare(`${scopedCte(scope)} SELECT rnk FROM ranked WHERE player_id = @playerId`)
      .get({ weekId, playerId }) as { rnk: number } | undefined;
    return row?.rnk ?? null;
  };
  return { weeklyRank: get("weekly"), allTimeRank: get("alltime") };
}

export function countRecentSubmissions(playerId: string, windowMs: number): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM game_sessions WHERE player_id = ? AND created_at > ?")
    .get(playerId, cutoff) as { n: number };
  return row.n;
}
