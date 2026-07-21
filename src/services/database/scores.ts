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

async function ensureWeek(weekId: string): Promise<void> {
  const db = await getDb();
  const start = weekStart(new Date());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  await db.execute({
    sql: "INSERT OR IGNORE INTO leaderboard_weeks (id, starts_at, ends_at) VALUES (?, ?, ?)",
    args: [weekId, start.toISOString(), end.toISOString()],
  });
}

export interface StoredSubmission {
  status: VerificationStatus;
  score: number;
  weekId: string;
  duplicate: boolean;
}

export async function findExistingSession(sessionId: string): Promise<StoredSubmission | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT verification_status, score, week_id FROM game_sessions WHERE id = ?",
    args: [sessionId],
  });
  const row = res.rows[0] as unknown as
    | { verification_status: VerificationStatus; score: number; week_id: string }
    | undefined;
  if (!row) return null;
  return {
    status: row.verification_status,
    score: Number(row.score),
    weekId: row.week_id,
    duplicate: true,
  };
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

export async function storeRun(
  playerId: string,
  run: RunStats,
  score: number,
  status: Exclude<VerificationStatus, "rejected">,
): Promise<StoredSubmission> {
  const db = await getDb();
  const weekId = weekIdFor(new Date());
  await ensureWeek(weekId);
  const createdAt = new Date().toISOString();
  const collectibles =
    run.collectibles.star + run.collectibles.codeToken + run.collectibles.wifi + run.collectibles.badge;

  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: `INSERT INTO game_sessions
        (id, player_id, started_at, ended_at, game_version, scoring_version, vehicle_id,
         result, distance, remaining_time, collisions, near_misses, dodges,
         stars, code_tokens, wifi, badges, highest_combo, combo_score, score,
         week_id, verification_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        run.sessionId, playerId, run.startedAt, run.endedAt, run.gameVersion, run.scoringVersion,
        run.vehicleId, run.result, run.distance, run.remainingTime, run.collisions, run.nearMisses,
        run.dodges, run.collectibles.star, run.collectibles.codeToken, run.collectibles.wifi,
        run.collectibles.badge, run.highestCombo, run.comboScore, score, weekId, status, createdAt,
      ],
    });

    // only verified runs occupy the public boards, one row per player per week
    if (status === "verified") {
      const candidate = {
        score,
        remaining_time: run.remainingTime,
        collisions: run.collisions,
        near_misses: run.nearMisses,
      };
      const existingRes = await tx.execute({
        sql: "SELECT id, score, remaining_time, collisions, near_misses FROM leaderboard_scores WHERE player_id = ? AND week_id = ?",
        args: [playerId, weekId],
      });
      const existing = existingRes.rows[0] as unknown as
        | { id: string; score: number; remaining_time: number; collisions: number; near_misses: number }
        | undefined;

      if (!existing || beats(candidate, existing)) {
        if (existing) {
          await tx.execute({
            sql: "DELETE FROM leaderboard_scores WHERE id = ?",
            args: [String(existing.id)],
          });
        }
        await tx.execute({
          sql: `INSERT INTO leaderboard_scores
            (id, player_id, session_id, week_id, score, distance, remaining_time,
             collisions, near_misses, collectibles, highest_combo, vehicle_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(), playerId, run.sessionId, weekId, score, run.distance,
            run.remainingTime, run.collisions, run.nearMisses, collectibles, run.highestCombo,
            run.vehicleId, createdAt,
          ],
        });
      }
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }

  return { status, score, weekId, duplicate: false };
}

/* ------------------------------ queries ------------------------------- */

interface RankedRow {
  player_id: string;
  display_name: string;
  avatar: string;
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
      SELECT b.*, p.display_name, p.avatar,
             ROW_NUMBER() OVER (ORDER BY ${TIE_ORDER_B}) AS rnk
      FROM best b JOIN players p ON p.id = b.player_id
      WHERE b.rn = 1
    )
  `;
}

function toEntry(r: RankedRow): LeaderboardEntry {
  return {
    rank: Number(r.rnk),
    playerId: r.player_id,
    displayName: r.display_name,
    avatar: r.avatar,
    vehicleId: r.vehicle_id as VehicleId,
    score: Number(r.score),
    remainingTime: Number(r.remaining_time),
    collisions: Number(r.collisions),
    nearMisses: Number(r.near_misses),
    createdAt: r.created_at,
  };
}

export async function queryLeaderboard(opts: {
  scope: "weekly" | "alltime";
  limit: number;
  cursor: number;
  q?: string;
  playerId?: string;
}): Promise<{
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
  weekId: string;
  nextCursor: number | null;
}> {
  const db = await getDb();
  const weekId = weekIdFor(new Date());
  await ensureWeek(weekId);
  const cte = scopedCte(opts.scope);
  // @weekId only appears in the weekly CTE; the remote Turso client rejects a
  // named arg that the SQL doesn't reference, so only pass it when weekly.
  const weekArgs: Record<string, string> =
    opts.scope === "weekly" ? { weekId } : {};

  const totalRes = await db.execute({
    sql: `${cte} SELECT COUNT(*) AS n FROM ranked`,
    args: weekArgs,
  });
  const total = Number((totalRes.rows[0] as unknown as { n: number }).n);

  const rowArgs: Record<string, string | number> = {
    ...weekArgs,
    limit: opts.limit,
    cursor: opts.cursor,
  };
  let rowsRes;
  if (opts.q) {
    rowArgs.q = opts.q;
    rowsRes = await db.execute({
      sql: `${cte} SELECT * FROM ranked WHERE instr(lower(display_name), lower(@q)) > 0 ORDER BY rnk LIMIT @limit OFFSET @cursor`,
      args: rowArgs,
    });
  } else {
    rowsRes = await db.execute({
      sql: `${cte} SELECT * FROM ranked ORDER BY rnk LIMIT @limit OFFSET @cursor`,
      args: rowArgs,
    });
  }
  const rows = rowsRes.rows as unknown as RankedRow[];

  let me: LeaderboardEntry | null = null;
  if (opts.playerId) {
    const meRes = await db.execute({
      sql: `${cte} SELECT * FROM ranked WHERE player_id = @playerId`,
      args: { ...weekArgs, playerId: opts.playerId },
    });
    const meRow = meRes.rows[0] as unknown as RankedRow | undefined;
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

export async function playerRanks(
  playerId: string,
): Promise<{ weeklyRank: number | null; allTimeRank: number | null }> {
  const db = await getDb();
  const weekId = weekIdFor(new Date());
  const get = async (scope: "weekly" | "alltime"): Promise<number | null> => {
    const args: Record<string, string> =
      scope === "weekly" ? { weekId, playerId } : { playerId };
    const res = await db.execute({
      sql: `${scopedCte(scope)} SELECT rnk FROM ranked WHERE player_id = @playerId`,
      args,
    });
    const row = res.rows[0] as unknown as { rnk: number } | undefined;
    return row ? Number(row.rnk) : null;
  };
  return { weeklyRank: await get("weekly"), allTimeRank: await get("alltime") };
}

export async function countRecentSubmissions(
  playerId: string,
  windowMs: number,
): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM game_sessions WHERE player_id = ? AND created_at > ?",
    args: [playerId, cutoff],
  });
  return Number((res.rows[0] as unknown as { n: number }).n);
}
