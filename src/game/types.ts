import type { RunStats, ScoreBreakdown, VehicleId } from "@/types/game";

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeUi: boolean;
}

export interface RunSceneConfig {
  vehicleId: VehicleId;
  settings: GameSettings;
  /** show the "how to steer" hint (first ever run) */
  showTutorial: boolean;
}

export interface RunFinishedPayload {
  stats: RunStats;
  breakdown: ScoreBreakdown;
}
