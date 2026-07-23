"use client";

import { useState } from "react";
import { DEFAULT_AVATAR } from "@/config/avatars";
import type { PlayerProfile } from "@/features/player/useProfile";

interface Props {
  initial: PlayerProfile | null;
  onBack: () => void;
  onDone: (profile: PlayerProfile) => void;
}

export function PlayerSetup({ initial, onBack, onDone }: Props) {
  const [name, setName] = useState(initial?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("Pick a name between 2 and 20 characters.");
      return;
    }
    onDone({ ...initial, displayName: trimmed, avatar: initial?.avatar ?? DEFAULT_AVATAR });
  };

  return (
    <div className="anim-pop-in mx-auto w-full max-w-md px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="df-btn df-btn-secondary mb-6 px-4 py-2 text-sm"
      >
        ← Back
      </button>

      <p className="df-label text-core-red">Driver registration</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        Who&apos;s driving today?
      </h1>

      <form onSubmit={submit} className="df-card df-shadow-lg mt-6 overflow-hidden">
        <div className="space-y-5 p-5">
          <div>
            <label htmlFor="displayName" className="df-label block">
              Driver name
            </label>
            <p className="mt-1 text-xs text-ink-soft">
              This is the name the leaderboard will show.
            </p>
            <input
              id="displayName"
              type="text"
              value={name}
              maxLength={20}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. AsyncAwesomeAda"
              className="df-border mt-2 w-full bg-paper px-4 py-3 font-[family-name:var(--font-grotesk)] text-lg font-bold transition-shadow placeholder:font-normal placeholder:text-ink/35 focus:shadow-[0_0_0_4px_rgba(29,140,126,0.25)] focus:outline-none"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm font-semibold text-core-red">
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="df-btn df-btn-accent w-full py-4 text-base">
            Choose Your Ride →
          </button>
        </div>
      </form>
    </div>
  );
}
