import type { RunStats } from "@/types/game";
import type {
  LeaderboardResponse,
  RegisterResponse,
  SubmitScoreResponse,
} from "@/types/leaderboard";
import { computeScore } from "@/game/balancing/scoring";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("Network request failed", 0, "network");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`,
      res.status,
      typeof body.code === "string" ? body.code : undefined,
    );
  }
  return body as T;
}

export function registerPlayer(input: {
  displayName: string;
  track: string;
  avatar: string;
}): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/players", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function renamePlayer(
  displayName: string,
  auth: { playerId: string; token: string },
): Promise<{ playerId: string; displayName: string }> {
  return request("/api/players", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ playerId: auth.playerId, displayName }),
  });
}

export function submitScore(
  run: RunStats,
  auth: { playerId: string; token: string },
): Promise<SubmitScoreResponse> {
  return request<SubmitScoreResponse>("/api/scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    // the claimed score lets the server detect tampered payloads/version drift
    body: JSON.stringify({
      playerId: auth.playerId,
      run,
      claimedScore: computeScore(run).total,
    }),
  });
}

export function fetchLeaderboard(params: {
  scope: "weekly" | "alltime";
  limit?: number;
  cursor?: number;
  q?: string;
  playerId?: string;
}): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams({ scope: params.scope });
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", String(params.cursor));
  if (params.q) qs.set("q", params.q);
  if (params.playerId) qs.set("playerId", params.playerId);
  return request<LeaderboardResponse>(`/api/leaderboard?${qs.toString()}`);
}
