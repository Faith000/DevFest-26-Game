import type { VehicleId } from "./game";

export type VerificationStatus = "verified" | "flagged" | "rejected";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatar: string;
  vehicleId: VehicleId;
  score: number;
  remainingTime: number;
  collisions: number;
  nearMisses: number;
  createdAt: string;
}

export interface LeaderboardResponse {
  scope: "weekly" | "alltime";
  weekId: string;
  entries: LeaderboardEntry[];
  /** the requesting player's own row, when known and not necessarily visible */
  me: LeaderboardEntry | null;
  total: number;
  nextCursor: number | null;
}

export interface RegisterResponse {
  playerId: string;
  token: string;
  displayName: string;
}

export interface SubmitScoreResponse {
  accepted: boolean;
  status: VerificationStatus;
  score: number;
  weeklyRank: number | null;
  allTimeRank: number | null;
  weekId: string;
  duplicate?: boolean;
}
