"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProfile } from "@/features/player/useProfile";
import { ApiError, registerPlayer } from "@/services/api";

interface Props {
  profile: PlayerProfile;
  onClaimed: (updated: PlayerProfile) => void;
  onCancel: () => void;
}

/**
 * Claims a leaderboard handle. The server issues a private token that stays
 * on this device — no email required, nothing personal collected.
 */
export function SaveScoreDialog({ profile, onClaimed, onCancel }: Props) {
  const [name, setName] = useState(profile.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("Names need 2–20 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await registerPlayer({
        displayName: trimmed,
        track: profile.track,
        avatar: profile.avatar,
      });
      onClaimed({
        ...profile,
        displayName: res.displayName,
        playerId: res.playerId,
        token: res.token,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "name_taken") {
        setError("That name is already on the grid. Try another.");
      } else if (err instanceof ApiError && err.code === "network") {
        setError("No connection. Your score is safe locally — try again soon.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-score-title"
    >
      <div ref={dialogRef} className="df-card w-full max-w-sm p-5">
        <p className="df-label text-core-red">LEADERBOARD</p>
        <h2 id="save-score-title" className="mt-1 font-[family-name:var(--font-grotesk)] text-2xl font-bold">
          Save your score
        </h2>
        <p className="mt-2 text-sm text-ink/70">
          Claim a driver handle to put this run on the public leaderboard. It
          stays on this device — no email needed.
        </p>
        <form onSubmit={claim} className="mt-4 space-y-4">
          <div>
            <label htmlFor="claimName" className="df-label block">
              Leaderboard name
            </label>
            <input
              id="claimName"
              value={name}
              maxLength={20}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="df-border mt-2 w-full bg-paper px-3 py-2.5 font-[family-name:var(--font-grotesk)] font-bold"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm font-semibold text-core-red">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="df-btn df-btn-primary flex-1 disabled:opacity-60">
              {busy ? "Claiming…" : "Claim & Submit"}
            </button>
            <button type="button" onClick={onCancel} className="df-btn df-btn-secondary">
              Not now
            </button>
          </div>
          <p className="text-xs text-ink/50">
            Keep playing as a guest any time — your personal best is always
            saved on this device.
          </p>
        </form>
      </div>
    </div>
  );
}
