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
    <div className="df-border bg-surface px-3 py-2.5">
      <p className="df-label text-[9px] text-ink-soft">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-grotesk)] text-xl font-bold tabular-nums">
        {value}
      </p>
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
    <div className="dot-grid absolute inset-0 z-20 overflow-y-auto bg-paper/98 backdrop-blur-sm">
      <div className="anim-pop-in mx-auto w-full max-w-lg px-4 py-10 pb-16">
        <div>
          <span
            className={`df-chip ${arrived ? "bg-core-green text-white" : "bg-core-red text-white"}`}
          >
            {arrived ? "● ARRIVED AT DEVFEST" : stats.result === "timeout" ? "● KEYNOTE STARTED" : "● VEHICLE WRECKED"}
          </span>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
            {arrived ? (
              <>
                You made it to <span className="text-core-red italic">DevFest Lagos</span>
              </>
            ) : (
              <>
                So close. <span className="text-core-red italic">So Lagos.</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">{headline(payload, isNewBest, weeklyRank)}</p>
        </div>

        <div className="df-card df-shadow-lg mt-6 overflow-hidden">
          <div className="flex items-end justify-between p-5">
            <div>
              <p className="df-label text-ink-soft">Final score</p>
              <p className="font-[family-name:var(--font-grotesk)] text-6xl leading-none font-bold tabular-nums">
                {breakdown.total.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="df-label text-ink-soft">Personal best</p>
              <p className="font-[family-name:var(--font-grotesk)] text-2xl font-bold tabular-nums">
                {Math.max(bestScore, breakdown.total).toLocaleString()}
              </p>
              {isNewBest && (
                <span className="df-chip mt-1 bg-core-green px-1.5 py-0 text-[9px] text-white">
                  ▲ NEW BEST
                </span>
              )}
            </div>
          </div>

          {submission.status === "done" && (
            <div className="flex items-center justify-between border-t-2 border-ink bg-pastel-blue px-4 py-2.5 text-sm font-bold">
              <span>
                Weekly #{submission.result.weeklyRank ?? "—"} · All-time #
                {submission.result.allTimeRank ?? "—"}
              </span>
              <Link href="/leaderboard" className="underline underline-offset-2">
                View →
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
            <div className="df-border w-full bg-surface px-4 py-3 text-center text-sm font-semibold" role="status">
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
          <button onClick={onPlayAgain} className="df-btn df-btn-accent col-span-2 py-4 text-lg">
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
