"use client";

import Link from "next/link";
import { site } from "@/config/site";
import { VEHICLES } from "@/game/balancing/vehicles";
import type { RunFinishedPayload } from "@/game/types";
import type { SubmitScoreResponse } from "@/types/leaderboard";
import { track } from "@/services/analytics";

export type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; result: SubmitScoreResponse }
  | { status: "pending"; message: string }
  | { status: "error"; message: string };

interface Props {
  payload: RunFinishedPayload;
  isNewBest: boolean;
  bestScore: number;
  submission: SubmissionState;
  onSubmit: () => void;
  onPlayAgain: () => void;
  onChangeVehicle: () => void;
  onShare: () => void;
  shareCopied: boolean;
}

function headline(p: RunFinishedPayload, isNewBest: boolean, weeklyRank: number | null): string {
  if (weeklyRank !== null && weeklyRank <= 10) {
    return "Top 10. The DevFest community now knows your name.";
  }
  if (isNewBest) {
    return "New personal best. You just moved faster than your last deployment.";
  }
  if (p.stats.result === "arrived") {
    return "And somehow, you are early.";
  }
  return "Lagos traffic won this round. Your keynote seat is still waiting.";
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="df-border bg-white px-3 py-2">
      <p className="df-label text-[9px] text-ink/60">{label}</p>
      <p className="font-[family-name:var(--font-grotesk)] text-lg font-bold">{value}</p>
    </div>
  );
}

export function ResultsScreen({
  payload,
  isNewBest,
  bestScore,
  submission,
  onSubmit,
  onPlayAgain,
  onChangeVehicle,
  onShare,
  shareCopied,
}: Props) {
  const { stats, breakdown } = payload;
  const arrived = stats.result === "arrived";
  const weeklyRank = submission.status === "done" ? submission.result.weeklyRank : null;
  const collectibles =
    stats.collectibles.star +
    stats.collectibles.codeToken +
    stats.collectibles.wifi +
    stats.collectibles.badge;

  return (
    <div className="dot-grid absolute inset-0 z-20 overflow-y-auto bg-paper/97">
      <div className="mx-auto w-full max-w-lg px-4 py-8 pb-16">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`df-chip ${arrived ? "bg-pastel-green" : "bg-pastel-pink"}`}>
              {arrived ? "● ARRIVED AT DEVFEST" : stats.result === "timeout" ? "● KEYNOTE STARTED" : "● VEHICLE WRECKED"}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-grotesk)] text-3xl font-bold leading-tight">
              {arrived ? "You Made It to DevFest Lagos" : "So Close. So Lagos."}
            </h1>
            <p className="mt-2 text-sm text-ink/70">{headline(payload, isNewBest, weeklyRank)}</p>
          </div>
        </div>

        <div className="df-card mt-6 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="df-label text-ink/60">FINAL SCORE</p>
              <p className="font-[family-name:var(--font-grotesk)] text-5xl font-bold tabular-nums">
                {breakdown.total.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="df-label text-ink/60">PERSONAL BEST</p>
              <p className="font-[family-name:var(--font-grotesk)] text-2xl font-bold tabular-nums">
                {Math.max(bestScore, breakdown.total).toLocaleString()}
                {isNewBest && <span className="ml-1 align-middle text-xs text-core-green">▲ NEW</span>}
              </p>
            </div>
          </div>

          {submission.status === "done" && (
            <div className="df-border mt-4 flex items-center justify-between bg-pastel-blue px-3 py-2 text-sm font-semibold">
              <span>
                Weekly rank #{submission.result.weeklyRank ?? "—"} · All-time #
                {submission.result.allTimeRank ?? "—"}
              </span>
              <Link href="/leaderboard" className="underline">
                View
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatCell label="DISTANCE" value={`${stats.distance}m`} />
          <StatCell label="TIME LEFT" value={`${Math.round(stats.remainingTime)}s`} />
          <StatCell label="NEAR MISSES" value={String(stats.nearMisses)} />
          <StatCell label="BEST COMBO" value={`x${Math.min(1 + Math.floor(stats.highestCombo / 4), 8)}`} />
          <StatCell label="COLLECTED" value={String(collectibles)} />
          <StatCell label="VEHICLE" value={VEHICLES[stats.vehicleId].name.split(" ")[1] ?? stats.vehicleId} />
        </div>

        {/* submission area — scores record automatically, no button */}
        <div className="mt-5">
          {(submission.status === "idle" || submission.status === "submitting") && (
            <div className="df-border w-full bg-white px-4 py-3 text-center text-sm font-semibold" role="status">
              Recording your score…
            </div>
          )}
          {(submission.status === "pending" || submission.status === "error") && (
            <div className="df-border w-full bg-pastel-yellow px-4 py-3 text-sm font-semibold" role="status">
              {submission.message}
              <button onClick={onSubmit} className="ml-2 underline">
                Retry now
              </button>
            </div>
          )}
          {submission.status === "done" && submission.result.status === "flagged" && (
            <div className="df-border w-full bg-pastel-yellow px-4 py-3 text-sm font-semibold" role="status">
              That run looked suspiciously fast — it&apos;s in review before it
              appears publicly.
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={onPlayAgain} className="df-btn df-btn-primary col-span-2 py-4 text-lg">
            ↻ Play Again
          </button>
          <button onClick={onChangeVehicle} className="df-btn df-btn-secondary">
            Change Vehicle
          </button>
          <Link href="/leaderboard" className="df-btn df-btn-secondary text-center">
            Leaderboard
          </Link>
          <button onClick={onShare} className="df-btn df-btn-secondary">
            {shareCopied ? "Copied!" : "Share Result"}
          </button>
          <a
            href={site.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("devfest_link_clicked", { from: "results" })}
            className="df-btn df-btn-secondary text-center"
          >
            DevFest Lagos ↗
          </a>
        </div>
      </div>
    </div>
  );
}
