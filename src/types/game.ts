export type VehicleId = "shuttle" | "danfo" | "bike";

export type CollectibleKind = "star" | "codeToken" | "wifi" | "badge";

export type PowerUpKind = "coffee" | "cloudShield" | "stableWifi" | "geminiAssist";

export type ObstacleKind =
  // Traffic
  | "danfoLaneChanger"
  | "slowTruck"
  | "okada"
  | "pothole"
  | "constructionBarrier"
  | "brokenDownCar"
  // Technology
  | "productionBug"
  | "mergeConflict"
  | "loadingSpinner"
  | "expiredApiKey"
  | "figmaLayers"
  | "fridayDeploy";

export type RunResult = "arrived" | "wrecked" | "timeout" | "abandoned";

/** Everything a finished run reports. This is the submission payload core. */
export interface RunStats {
  sessionId: string;
  vehicleId: VehicleId;
  startedAt: number; // epoch ms, wall clock
  endedAt: number; // epoch ms, wall clock
  result: RunResult;
  /** metres travelled (integer) */
  distance: number;
  /** seconds left on the keynote clock at the end (0 if it ran out) */
  remainingTime: number;
  collisions: number;
  nearMisses: number;
  /** obstacles fully passed without contact */
  dodges: number;
  collectibles: {
    star: number;
    codeToken: number;
    wifi: number;
    badge: number;
  };
  highestCombo: number;
  /** combo bonus points accumulated in-run (server bounds-checks this) */
  comboScore: number;
  gameVersion: string;
  scoringVersion: string;
}

export interface ScoreBreakdown {
  distanceScore: number;
  collectibleScore: number;
  nearMissScore: number;
  comboScore: number;
  remainingTimeBonus: number;
  vehicleMultiplier: number;
  collisionPenalty: number;
  total: number;
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  description: string;
  /** multiplies base road speed */
  speedFactor: number;
  /** ms to complete a lane change */
  laneChangeMs: number;
  /** collision body scale relative to sprite */
  hitboxScale: number;
  /** starts the run with a one-hit shield */
  startingShield: boolean;
  /** multiplies near-miss points */
  nearMissBonus: number;
  /** final score multiplier (difficulty compensation) */
  scoreMultiplier: number;
  /** 0-5 for the stat bars in the picker */
  stats: { speed: number; handling: number; toughness: number };
}
