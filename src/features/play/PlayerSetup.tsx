"use client";

import { useState } from "react";
import { DEFAULT_AVATAR } from "@/config/avatars";
import type { PlayerProfile } from "@/features/player/useProfile";

interface Props {
  initial: PlayerProfile | null;
  onDone: (profile: PlayerProfile) => void;
}

export function PlayerSetup({ initial, onDone }: Props) {
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
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <p className="df-label text-core-red">DRIVER REGISTRATION</p>
      <h1 className="mt-1 font-[family-name:var(--font-grotesk)] text-3xl font-bold">
        Who&apos;s driving today?
      </h1>

      <form onSubmit={submit} className="df-card mt-6 space-y-5 p-5">
        <div>
          <label htmlFor="displayName" className="df-label block">
            Driver name
          </label>
          <p className="mt-1 text-xs text-ink/60">
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
            className="df-border mt-2 w-full bg-paper px-3 py-2.5 font-[family-name:var(--font-grotesk)] font-bold placeholder:font-normal placeholder:text-ink/40"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-core-red">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="df-btn df-btn-primary w-full text-base">
          Choose Your Ride →
        </button>
      </form>
    </div>
  );
}
