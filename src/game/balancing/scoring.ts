/**
 * Deterministic scoring — SCORING_VERSION "s1".
 *
 * This module is pure TypeScript with no Phaser imports so the exact same
 * code runs in the game client and in the server-side validation layer.
 * Every submitted run is recomputed here on the server; a mismatch is
 * rejected. Only `comboScore` is accumulated in-run (it depends on event
 * order), so the server bounds-checks it instead of recomputing.
 */
import type { RunStats, ScoreBreakdown } from "@/types/game";
import { VEHICLES } from "./vehicles";

export const SCORING = {
  pointsPerMetre: 2,
  collectibleValues: {
    star: 150,
    codeToken: 100,
    wifi: 120,
    badge: 200,
  },
  nearMissBase: 100,
  /** each clean dodge / near miss adds comboStep * current multiplier */
  comboStep: 25,
  maxComboMultiplier: 8,
  /** events needed to raise the multiplier by one */
  comboEventsPerLevel: 4,
  remainingSecondBonus: 120,
  collisionPenalty: 400,
} as const;

export function comboMultiplier(comboCount: number): number {
  return Math.min(
    1 + Math.floor(comboCount / SCORING.comboEventsPerLevel),
    SCORING.maxComboMultiplier,
  );
}

export function computeScore(run: RunStats): ScoreBreakdown {
  const vehicle = VEHICLES[run.vehicleId];
  const c = run.collectibles;

  const distanceScore = Math.floor(run.distance) * SCORING.pointsPerMetre;
  const collectibleScore =
    c.star * SCORING.collectibleValues.star +
    c.codeToken * SCORING.collectibleValues.codeToken +
    c.wifi * SCORING.collectibleValues.wifi +
    c.badge * SCORING.collectibleValues.badge;
  const nearMissScore = Math.round(
    run.nearMisses * SCORING.nearMissBase * vehicle.nearMissBonus,
  );
  const comboScore = Math.max(0, Math.round(run.comboScore));
  const remainingTimeBonus =
    run.result === "arrived"
      ? Math.round(run.remainingTime) * SCORING.remainingSecondBonus
      : 0;
  const collisionPenalty = run.collisions * SCORING.collisionPenalty;

  const subtotal =
    distanceScore + collectibleScore + nearMissScore + comboScore + remainingTimeBonus;
  const total = Math.max(
    0,
    Math.round(subtotal * vehicle.scoreMultiplier) - collisionPenalty,
  );

  return {
    distanceScore,
    collectibleScore,
    nearMissScore,
    comboScore,
    remainingTimeBonus,
    vehicleMultiplier: vehicle.scoreMultiplier,
    collisionPenalty,
    total,
  };
}

/** Upper bound for the client-accumulated combo score, used by validation. */
export function maxPlausibleComboScore(run: RunStats): number {
  const events = run.dodges + run.nearMisses;
  return events * SCORING.comboStep * SCORING.maxComboMultiplier;
}
