import type { RunStats } from "@/types/game";
import { RUN } from "@/game/balancing/run";
import { computeScore, maxPlausibleComboScore } from "@/game/balancing/scoring";
import { isValidVehicle } from "@/game/balancing/vehicles";
import {
  SUPPORTED_GAME_VERSIONS,
  SUPPORTED_SCORING_VERSIONS,
} from "@/config/version";

export type ValidationOutcome =
  | { verdict: "rejected"; reason: string }
  | { verdict: "verified" | "flagged"; score: number; reasons: string[] };

const isInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && Number.isFinite(n);
const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/**
 * Server-side gatekeeper. Nothing the client claims is trusted:
 * the score is recomputed with the shared deterministic formula and every
 * quantity is bounds-checked against what the simulation can physically
 * produce. Any run that survives those hard checks is published — there is
 * no soft "flagged" tier. This is a promotional game, and hiding possible-
 * but-unusual runs punished skilled players without meaningfully stopping a
 * determined cheat (the game is client-side, so the physics bounds are the
 * real defence).
 */
export function validateRun(run: RunStats, submittedScore: number): ValidationOutcome {
  const reject = (reason: string): ValidationOutcome => ({ verdict: "rejected", reason });

  /* ---- shape & enums ---- */
  if (typeof run.sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(run.sessionId)) {
    return reject("bad session id");
  }
  if (!isValidVehicle(run.vehicleId)) return reject("unknown vehicle");
  if (!SUPPORTED_GAME_VERSIONS.includes(run.gameVersion)) return reject("unsupported game version");
  if (!SUPPORTED_SCORING_VERSIONS.includes(run.scoringVersion)) return reject("unsupported scoring version");
  if (!["arrived", "wrecked", "timeout"].includes(run.result)) return reject("unfinished runs are not submittable");

  const c = run.collectibles;
  const nums = [
    run.startedAt, run.endedAt, run.distance, run.collisions, run.nearMisses,
    run.dodges, run.highestCombo, run.comboScore, c.star, c.codeToken, c.wifi, c.badge,
  ];
  if (!nums.every(isInt) || !isNum(run.remainingTime)) return reject("malformed run data");
  if (nums.some((n) => n < 0) || run.remainingTime < 0) return reject("negative values");

  /* ---- clocks ---- */
  const now = Date.now();
  const wallSeconds = (run.endedAt - run.startedAt) / 1000;
  if (run.endedAt > now + 120_000) return reject("run ends in the future");
  if (run.startedAt > run.endedAt) return reject("time runs backwards");
  if (wallSeconds < 10 || wallSeconds > 1800) return reject("implausible run duration");

  const maxBadgeTime = c.badge * RUN.badgeTimeBonus;
  const gameSeconds = RUN.keynoteSeconds + maxBadgeTime - run.remainingTime;
  if (gameSeconds < 10) return reject("run too short for the clock state");
  if (run.remainingTime > RUN.keynoteSeconds + maxBadgeTime) return reject("timer overflow");
  // wall time can exceed game time (pauses); the reverse cannot happen
  if (gameSeconds > wallSeconds + 3) return reject("timer inconsistent with wall clock");

  /* ---- physical limits ---- */
  if (run.distance > RUN.goalDistance) return reject("distance beyond the venue");
  // absolute ceiling: top speed + coffee + fastest vehicle the whole run
  const maxMetres = ((RUN.maxSpeed * 1.28 * 1.07) / RUN.pxPerMetre) * gameSeconds;
  if (run.distance > maxMetres) return reject("faster than physically possible");

  if (run.result === "arrived" && run.distance < RUN.goalDistance) return reject("arrived without reaching the venue");
  if (run.result === "timeout" && run.remainingTime > 0.5) return reject("timeout with time remaining");
  if (run.result === "arrived" && run.remainingTime <= 0) return reject("arrived after the keynote");

  const maxCollisions = RUN.maxIntegrity;
  if (run.collisions > maxCollisions) return reject("too many collisions to still be driving");
  if (run.result === "wrecked" && run.collisions < RUN.maxIntegrity) return reject("wrecked while intact");
  if (run.result !== "wrecked" && run.collisions >= RUN.maxIntegrity) return reject("driving a wreck");

  /* ---- event-rate limits (spawner can't physically exceed these) ---- */
  if (run.dodges > gameSeconds * 2.6) return reject("more dodges than traffic");
  if (run.nearMisses > run.dodges) return reject("near misses exceed dodges");
  if (c.star + c.codeToken + c.wifi > gameSeconds * 3.6) return reject("more collectibles than were spawned");
  if (c.badge > Math.ceil(gameSeconds / 15) + 1) return reject("more badges than were spawned");
  if (run.highestCombo > 2 * (run.dodges + run.nearMisses)) return reject("combo exceeds combo events");
  if (run.comboScore > maxPlausibleComboScore(run)) return reject("combo score above ceiling");

  /* ---- the score itself is never trusted ---- */
  const recomputed = computeScore(run).total;
  if (recomputed !== submittedScore) return reject("score does not match the deterministic formula");

  // Survived every hard physics check → it's a run a real player could have
  // produced, so publish it. No soft-heuristic flagging (see the note above).
  return { verdict: "verified", score: recomputed, reasons: [] };
}
