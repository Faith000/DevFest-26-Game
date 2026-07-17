import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Self-contained persistence for the first release.
 *
 * Deployment note: the spec suggested Supabase, but production Supabase
 * credentials are not available to this build, and a leaderboard that only
 * works with missing secrets would ship broken. Every query lives behind
 * the repository functions in this folder, so swapping this module for a
 * Supabase/Postgres client later is a contained change (the SQL below is
 * already Postgres-friendly).
 */

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(path.join(dir, "game.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      display_name_lower TEXT NOT NULL UNIQUE,
      track TEXT NOT NULL,
      avatar TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leaderboard_weeks (
      id TEXT PRIMARY KEY,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      game_version TEXT NOT NULL,
      scoring_version TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      result TEXT NOT NULL,
      distance INTEGER NOT NULL,
      remaining_time REAL NOT NULL,
      collisions INTEGER NOT NULL,
      near_misses INTEGER NOT NULL,
      dodges INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      code_tokens INTEGER NOT NULL,
      wifi INTEGER NOT NULL,
      badges INTEGER NOT NULL,
      highest_combo INTEGER NOT NULL,
      combo_score INTEGER NOT NULL,
      score INTEGER NOT NULL,
      week_id TEXT NOT NULL REFERENCES leaderboard_weeks(id),
      verification_status TEXT NOT NULL CHECK (verification_status IN ('verified','flagged','rejected')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_player ON game_sessions(player_id, created_at);

    CREATE TABLE IF NOT EXISTS leaderboard_scores (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      session_id TEXT NOT NULL UNIQUE REFERENCES game_sessions(id),
      week_id TEXT NOT NULL REFERENCES leaderboard_weeks(id),
      score INTEGER NOT NULL CHECK (score >= 0),
      distance INTEGER NOT NULL,
      remaining_time REAL NOT NULL,
      collisions INTEGER NOT NULL,
      near_misses INTEGER NOT NULL,
      collectibles INTEGER NOT NULL,
      highest_combo INTEGER NOT NULL,
      vehicle_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(player_id, week_id)
    );
    CREATE INDEX IF NOT EXISTS idx_lb_week_score ON leaderboard_scores(week_id, score DESC);
    CREATE INDEX IF NOT EXISTS idx_lb_player ON leaderboard_scores(player_id);

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      params TEXT,
      created_at TEXT NOT NULL
    );
  `);
}
