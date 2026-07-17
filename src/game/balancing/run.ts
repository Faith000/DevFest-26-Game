/**
 * Run/route constants. Shared by the game and the server validator.
 */
export const RUN = {
  /** keynote countdown in seconds */
  keynoteSeconds: 90,
  /** metres to the DevFest gate */
  goalDistance: 1500,
  /** world px per metre (speeds below are px/s) */
  pxPerMetre: 20,

  /** base road speed at the start of a run, px/s */
  baseSpeed: 300,
  /** top road speed reached by the difficulty curve, px/s */
  maxSpeed: 600,
  /** seconds of gentle "teach the rhythm" phase */
  warmupSeconds: 15,
  /** seconds over which speed ramps from base to max (after warmup) */
  rampSeconds: 65,

  /** seconds granted by an event badge pickup */
  badgeTimeBonus: 5,

  /** integrity pips */
  maxIntegrity: 3,
  /** seconds of invulnerability after a hit */
  hitInvulnSeconds: 2.2,
  /** speed multiplier immediately after a hit */
  hitSlowFactor: 0.45,
  /** seconds to recover speed after a hit */
  hitSlowRecovery: 1.5,
  /** forgiveness margin shaved off collision boxes, px per side */
  collisionGrace: 6,

  /** route visual beats as fractions of goal distance */
  beats: {
    morning: 0.0,
    mainland: 0.18,
    flyover: 0.45,
    rain: 0.65,
    approach: 0.82,
  },
} as const;

export type RouteBeat = keyof typeof RUN.beats;

export function beatForProgress(progress: number): RouteBeat {
  if (progress >= RUN.beats.approach) return "approach";
  if (progress >= RUN.beats.rain) return "rain";
  if (progress >= RUN.beats.flyover) return "flyover";
  if (progress >= RUN.beats.mainland) return "mainland";
  return "morning";
}
