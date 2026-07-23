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
    <div className="df-card overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink bg-pastel-blue px-4 py-2.5">
        <p className="df-label">This week&apos;s fastest</p>
        <Link
          href="/leaderboard"
          className="df-label text-ink underline-offset-2 hover:underline"
        >
          All →
        </Link>
      </div>

      <div className="p-3">
        {failed && (
          <p className="px-1 py-2 text-sm text-ink-soft">
            The leaderboard is stuck in traffic. It&apos;ll catch up.
          </p>
        )}

        {!failed && entries === null && (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        )}

        {!failed && entries !== null && entries.length === 0 && (
          <p className="px-1 py-2 text-sm text-ink-soft">
            Nobody has beaten the traffic yet. The podium is wide open.
          </p>
        )}

        {!failed && entries !== null && entries.length > 0 && (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li
                key={e.playerId}
                className="df-border flex items-center gap-2.5 bg-paper px-3 py-2"
              >
                <span aria-hidden className="text-base">
                  {MEDALS[i]}
                </span>
                <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-grotesk)] text-sm font-bold">
                  {e.displayName}
                </span>
                <span className="font-[family-name:var(--font-mono-df)] text-sm font-bold tabular-nums">
                  {e.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
