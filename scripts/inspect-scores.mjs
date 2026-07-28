#!/usr/bin/env node
/**
 * Read-only diagnostic: list top runs across ALL verification statuses, so you
 * can find a specific high score and see why it may not be on the leaderboard
 * (e.g. stored as `flagged`, so hidden). Writes NOTHING.
 *
 * Target database (same rules as src/services/database/db.ts):
 *   - Remote Turso  : set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN)
 *   - Local dev file: ELTT_DB_PATH, else <cwd>/.data/game.db
 *
 * Usage:
 *   node scripts/inspect-scores.mjs                 # top 25 by score
 *   node scripts/inspect-scores.mjs --min=35000     # only scores >= 35000
 *   node scripts/inspect-scores.mjs --name=ada      # filter by name substring
 *   node scripts/inspect-scores.mjs --limit=50
 */
import path from "node:path";

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}
const minScore = Number(arg("min", "0"));
const nameLike = String(arg("name", "")).toLowerCase();
const limit = Number(arg("limit", "25"));

async function openDb() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    const { createClient } = await import("@libsql/client/web");
    return {
      label: `remote Turso (${url.replace(/^(\w+:\/\/[^.]+).*/, "$1…")})`,
      client: createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim(), intMode: "number" }),
    };
  }
  const file = process.env.ELTT_DB_PATH?.trim() || path.join(process.cwd(), ".data", "game.db");
  const { createClient } = await import("@libsql/client");
  return { label: `local file (${file})`, client: createClient({ url: "file:" + file, intMode: "number" }) };
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  const { label, client: db } = await openDb();
  console.log(`\nTarget database: ${label}\n`);

  const clauses = ["gs.score >= @min"];
  const args = { min: minScore, limit };
  if (nameLike) {
    clauses.push("instr(lower(p.display_name), @name) > 0");
    args.name = nameLike;
  }

  const res = await db.execute({
    sql: `SELECT gs.score, gs.verification_status AS status, gs.result,
                 COALESCE(p.display_name, '(unknown)') AS name, gs.created_at,
                 CASE WHEN ls.id IS NOT NULL THEN 'yes' ELSE 'no' END AS on_board
          FROM game_sessions gs
          LEFT JOIN players p ON p.id = gs.player_id
          LEFT JOIN leaderboard_scores ls ON ls.session_id = gs.id
          WHERE ${clauses.join(" AND ")}
          ORDER BY gs.score DESC
          LIMIT @limit`,
    args,
  });

  if (res.rows.length === 0) {
    console.log("No matching runs found.\n");
    return;
  }
  console.log(
    `${pad("SCORE", 9)}${pad("STATUS", 10)}${pad("RESULT", 9)}${pad("ON BOARD", 9)}${pad("PLAYER", 22)}WHEN`,
  );
  console.log("-".repeat(78));
  for (const r of res.rows) {
    console.log(
      `${pad(Number(r.score).toLocaleString(), 9)}${pad(r.status, 10)}${pad(r.result, 9)}${pad(r.on_board, 9)}${pad(r.name, 22)}${String(r.created_at).slice(0, 10)}`,
    );
  }
  console.log(`\n${res.rows.length} row(s). "on board = no" means the run exists but isn't on the public leaderboard.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
