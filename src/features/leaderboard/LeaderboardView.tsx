"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry, LeaderboardResponse } from "@/types/leaderboard";
import { fetchLeaderboard } from "@/services/api";
import { useProfile } from "@/features/player/useProfile";
import { track } from "@/services/analytics";

type Scope = "weekly" | "alltime";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const medal = MEDALS[entry.rank];
  const top = entry.rank <= 3;
  return (
    <li
      className={`df-border flex items-center gap-3 px-3 py-2.5 ${
        isMe ? "bg-pastel-yellow" : top ? "bg-pastel-blue/40" : "bg-white"
      }`}
    >
      <span
        className={`flex w-9 shrink-0 items-center justify-center font-[family-name:var(--font-grotesk)] font-bold tabular-nums ${
          top ? "text-lg" : ""
        }`}
      >
        {medal ?? `#${entry.rank}`}
      </span>
      <span className="text-xl" aria-hidden>
        {entry.avatar}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-[family-name:var(--font-grotesk)] font-bold">
          {entry.displayName}
          {isMe && <span className="ml-1.5 text-xs text-core-red">← you</span>}
        </span>
      </span>
      <span className="w-20 shrink-0 text-right font-[family-name:var(--font-mono-df)] text-sm font-bold tabular-nums">
        {entry.score.toLocaleString()}
      </span>
    </li>
  );
}

export function LeaderboardView() {
  const { profile } = useProfile();
  const [scope, setScope] = useState<Scope>("weekly");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(
    (s: Scope, playerId?: string) => {
      const seq = ++requestSeq.current;
      setState("loading");
      fetchLeaderboard({ scope: s, limit: 20, playerId })
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
    track("leaderboard_viewed", { scope });
  }, [scope]);

  const playerId = profile?.playerId;
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load(scope, playerId);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, playerId, load]);

  const loadMore = async () => {
    if (!data?.nextCursor) return;
    setLoadingMore(true);
    try {
      const r = await fetchLeaderboard({
        scope,
        limit: 20,
        cursor: data.nextCursor,
        playerId: profile?.playerId,
      });
      setData(r);
      setEntries((prev) => [...prev, ...r.entries]);
    } catch {
      /* keep what we have; the button stays for retry */
    } finally {
      setLoadingMore(false);
    }
  };

  const me = data?.me ?? null;
  const meVisible = me !== null && entries.some((e) => e.playerId === me.playerId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-16">
      <p className="df-label text-core-red">HALL OF SPEED</p>
      <h1 className="mt-1 font-[family-name:var(--font-grotesk)] text-3xl font-bold">
        Leaderboard
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        Only verified runs count. Week resets Monday 00:00 UTC.
      </p>

      {/* tabs */}
      <div role="tablist" aria-label="Leaderboard scope" className="mt-6 flex flex-wrap items-center gap-2">
        {(
          [
            ["weekly", "This Week"],
            ["alltime", "All Time"],
          ] as Array<[Scope, string]>
        ).map(([s, label]) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => {
              setScope(s);
              setEntries([]);
            }}
            className={`df-btn px-5 py-2.5 text-sm ${
              scope === s ? "df-btn-primary" : "df-btn-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* personal rank card */}
      {me && !meVisible && (
        <div className="df-border df-shadow mt-4 flex items-center justify-between bg-pastel-yellow px-4 py-3">
          <p className="font-[family-name:var(--font-grotesk)] font-bold">
            Your {scope === "weekly" ? "weekly" : "all-time"} rank: #{me.rank}
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
              onClick={() => load(scope, profile?.playerId)}
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
            {data?.nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="df-btn df-btn-secondary mt-4 w-full disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
            <p className="df-label mt-4 text-center text-ink/40">
              TOP 50 SHOWN · {data?.total ?? 0} DRIVER{(data?.total ?? 0) === 1 ? "" : "S"} TOTAL
            </p>
          </>
        )}
      </div>
    </div>
  );
}
