import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Client } from "@libsql/client";

/**
 * Persistence via libSQL (SQLite dialect), so the same code runs everywhere:
 *
 *   - Prod / serverless (Vercel, Netlify): set TURSO_DATABASE_URL (and
 *     TURSO_AUTH_TOKEN) to a hosted Turso database. The pure-fetch web client
 *     is used, so there is no native module and no filesystem dependency.
 *   - Local dev / persistent servers: an embedded SQLite file is used. The
 *     path is ELTT_DB_PATH, else <cwd>/.data/game.db, else <tmpdir>/eltt.
 *
 * All access goes through the async repository functions in this folder; the
 * SQL is plain SQLite so switching hosted providers stays a contained change.
 */

let clientPromise: Promise<Client> | null = null;

/** First writable file path for the embedded (local) database. */
function localFileUrl(): string {
  const candidates: string[] = [];
  const envPath = process.env.ELTT_DB_PATH?.trim();
  if (envPath) candidates.push(envPath);
  candidates.push(path.join(process.cwd(), ".data", "game.db"));
  candidates.push(path.join(os.tmpdir(), "eltt", "game.db"));
  for (const file of candidates) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      return "file:" + file;
    } catch {
      // read-only / permission error — try the next candidate
    }
  }
  return "file:" + path.join(os.tmpdir(), "game.db");
}

async function createDbClient(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) {
    // Remote Turso — the /web entry is fetch-based (no native binary), which
    // is what makes serverless work.
    const { createClient } = await import("@libsql/client/web");
    return createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
      intMode: "number",
    });
  }
  // Embedded SQLite file for local dev / persistent servers.
  const { createClient } = await import("@libsql/client");
  return createClient({ url: localFileUrl(), intMode: "number" });
}

/** Lazily opens the database and runs migrations exactly once per process. */
export async function getDb(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = await createDbClient();
      await migrate(client);
      return client;
    })().catch((err) => {
      clientPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return clientPromise;
}

/** Idempotent schema. Safe to run on every cold start. */
async function migrate(db: Client): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_lower TEXT NOT NULL,
        avatar TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS leaderboard_weeks (
        id TEXT PRIMARY KEY,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
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
        week_id TEXT NOT NULL,
        verification_status TEXT NOT NULL CHECK (verification_status IN ('verified','flagged','rejected')),
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_player ON game_sessions(player_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS leaderboard_scores (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        week_id TEXT NOT NULL,
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lb_week_score ON leaderboard_scores(week_id, score DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_lb_player ON leaderboard_scores(player_id)`,
      `CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        params TEXT,
        created_at TEXT NOT NULL
      )`,
    ],
    "write",
  );
}
