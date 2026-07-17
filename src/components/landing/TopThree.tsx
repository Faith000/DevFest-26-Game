"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/types/leaderboard";
import { fetchLeaderboard } from "@/services/api";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Compact "top three this week" card for the landing hero. */
export function TopThree() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchLeaderboard({ scope: "weekly", limit: 3 })
      .then((r) => setEntries(r.entries))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="df-card p-4">
      <div className="flex items-center justify-between">
        <p className="df-label">THIS WEEK&apos;S FASTEST</p>
        <Link href="/leaderboard" className="df-label text-core-blue hover:underline">
          ALL →
        </Link>
      </div>

      {failed && (
        <p className="mt-3 text-sm text-ink/60">
          The leaderboard is stuck in traffic. It&apos;ll catch up.
        </p>
      )}

      {!failed && entries === null && (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-9 w-full" />
          ))}
        </div>
      )}

      {!failed && entries !== null && entries.length === 0 && (
        <p className="mt-3 text-sm text-ink/60">
          Nobody has beaten the traffic yet. The podium is wide open.
        </p>
      )}

      {!failed && entries !== null && entries.length > 0 && (
        <ol className="mt-3 space-y-2">
          {entries.map((e, i) => (
            <li
              key={e.playerId}
              className="df-border flex items-center gap-2 bg-paper px-2.5 py-1.5"
            >
              <span aria-hidden>{MEDALS[i]}</span>
              <span aria-hidden>{e.avatar}</span>
              <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-grotesk)] text-sm font-bold">
                {e.displayName}
              </span>
              <span className="font-[family-name:var(--font-mono-df)] text-xs font-bold tabular-nums">
                {e.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
