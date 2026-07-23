"use client";

import { useState } from "react";
import { AVATARS } from "@/config/avatars";
import type { PlayerProfile } from "@/features/player/useProfile";

interface Props {
  initial: PlayerProfile | null;
  onDone: (profile: PlayerProfile) => void;
}

export function PlayerSetup({ initial, onDone }: Props) {
  const [name, setName] = useState(initial?.displayName ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0]);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("Pick a name between 2 and 20 characters.");
      return;
    }
    onDone({ ...initial, displayName: trimmed, avatar });
  };

  return (
    <div className="anim-pop-in mx-auto w-full max-w-md px-4 py-10">
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

          <fieldset>
            <legend className="df-label">Pick an avatar</legend>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  aria-pressed={avatar === a}
                  aria-label={`Avatar ${a}`}
                  className={`df-border flex aspect-square items-center justify-center text-xl transition-all ${
                    avatar === a
                      ? "-translate-y-0.5 bg-pastel-yellow df-shadow"
                      : "bg-surface hover:bg-paper"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="df-btn df-btn-accent w-full py-4 text-base">
            Choose Your Ride →
          </button>
        </div>
      </form>
    </div>
  );
}
