"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry, LeaderboardResponse } from "@/types/leaderboard";
import { fetchLeaderboard } from "@/services/api";
import { useProfile } from "@/features/player/useProfile";
import { track } from "@/services/analytics";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const medal = MEDALS[entry.rank];
  const top = entry.rank <= 3;
  const accent =
    entry.rank === 1
      ? "before:bg-core-amber"
      : entry.rank === 2
        ? "before:bg-core-blue"
        : entry.rank === 3
          ? "before:bg-core-red"
          : "before:bg-transparent";
  return (
    <li
      className={`df-border hover-lift relative flex items-center gap-3 overflow-hidden py-2.5 pr-3 pl-5 before:absolute before:top-0 before:left-0 before:h-full before:w-2 before:content-[''] ${accent} ${
        isMe ? "bg-pastel-yellow" : "bg-surface"
      }`}
    >
      <span
        className={`flex w-9 shrink-0 items-center justify-center font-[family-name:var(--font-grotesk)] font-bold tabular-nums ${
          top ? "text-xl" : "text-ink-soft"
        }`}
      >
        {medal ?? `#${entry.rank}`}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[family-name:var(--font-grotesk)] font-bold">
          {entry.displayName}
          {isMe && (
            <span className="df-chip ml-2 bg-core-red px-1.5 py-0 text-[9px] text-white">
              YOU
            </span>
          )}
        </span>
      </span>
      <span className="w-20 shrink-0 text-right font-[family-name:var(--font-grotesk)] text-base font-bold tabular-nums">
        {entry.score.toLocaleString()}
      </span>
    </li>
  );
}

export function LeaderboardView() {
  const { profile } = useProfile();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const requestSeq = useRef(0);

  const load = useCallback(
    (playerId?: string) => {
      const seq = ++requestSeq.current;
      setState("loading");
      fetchLeaderboard({ scope: "alltime", limit: 50, playerId })
        .then((r) => {
          if (seq !== requestSeq.current) return;
          setData(r);
          setEntries(r.entries);
          setState("ready");
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setState("error");
        });
    },
    [],
  );

  useEffect(() => {
    track("leaderboard_viewed", { scope: "alltime" });
  }, []);

  const playerId = profile?.playerId;
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load(playerId);
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, load]);

  const me = data?.me ?? null;
  const meVisible = me !== null && entries.some((e) => e.playerId === me.playerId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-16">
      <div className="flex items-center gap-3">
        <span className="checker h-8 w-8 border-2 border-ink" aria-hidden />
        <p className="df-label text-core-red">Hall of Speed</p>
      </div>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
        Leaderboard
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Only verified runs count. Only the top 50 drivers will be displayed.
      </p>

      {/* personal rank card */}
      {me && !meVisible && (
        <div className="df-border df-shadow mt-4 flex items-center justify-between bg-pastel-yellow px-4 py-3">
          <p className="font-[family-name:var(--font-grotesk)] font-bold">
            Your rank: #{me.rank}
          </p>
          <p className="font-[family-name:var(--font-mono-df)] text-sm font-bold tabular-nums">
            {me.score.toLocaleString()}
          </p>
        </div>
      )}

      <div className="mt-6">
        {state === "loading" && (
          <div className="space-y-2" aria-label="Loading leaderboard">
            <div className="skeleton h-36 w-full" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="df-card p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🚧
            </p>
            <p className="mt-2 font-[family-name:var(--font-grotesk)] text-lg font-bold">
              The leaderboard is stuck in traffic.
            </p>
            <p className="mt-1 text-sm text-ink/70">
              Nothing lost — give it another go.
            </p>
            <button
              onClick={() => load(profile?.playerId)}
              className="df-btn df-btn-primary mt-4"
            >
              Retry
            </button>
          </div>
        )}

        {state === "ready" && entries.length === 0 && (
          <div className="df-card p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🏁
            </p>
            <p className="mt-2 font-[family-name:var(--font-grotesk)] text-lg font-bold">
              Nobody has beaten the traffic yet.
            </p>
            <p className="mt-1 text-sm text-ink/70">
              The podium is wide open. Set the first time.
            </p>
            <Link href="/play" className="df-btn df-btn-primary mt-4">
              Start Driving
            </Link>
          </div>
        )}

        {state === "ready" && entries.length > 0 && (
          <>
            <ol className="space-y-2">
              {entries.map((e) => (
                <Row key={e.playerId} entry={e} isMe={e.playerId === profile?.playerId} />
              ))}
            </ol>
            <p className="df-label mt-4 text-center text-ink/40">
              TOP 50 DISPLAYED · {data?.total ?? 0} DRIVER{(data?.total ?? 0) === 1 ? "" : "S"} TOTAL
            </p>
          </>
        )}
      </div>
    </div>
  );
}
