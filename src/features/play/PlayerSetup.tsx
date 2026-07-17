"use client";

import { useState } from "react";
import { AVATARS } from "@/config/avatars";
import { DEVFEST_TRACKS } from "@/config/tracks";
import type { PlayerProfile } from "@/features/player/useProfile";

interface Props {
  initial: PlayerProfile | null;
  /** resolves to an error message, or null when the profile was saved */
  onDone: (profile: PlayerProfile) => Promise<string | null>;
}

export function PlayerSetup({ initial, onDone }: Props) {
  const [name, setName] = useState(initial?.displayName ?? "");
  const [track, setTrack] = useState(initial?.track ?? DEVFEST_TRACKS[0]);
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("Pick a name between 2 and 20 characters.");
      return;
    }
    setBusy(true);
    const err = await onDone({ ...initial, displayName: trimmed, track, avatar });
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <p className="df-label text-core-red">DRIVER REGISTRATION</p>
      <h1 className="mt-1 font-[family-name:var(--font-grotesk)] text-3xl font-bold">
        Who&apos;s driving today?
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        You can play as a guest. Sign in only when you want to save your score
        to the public leaderboard.
      </p>

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

        <div>
          <label htmlFor="track" className="df-label block">
            Preferred DevFest track
          </label>
          <select
            id="track"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="df-border mt-2 w-full bg-paper px-3 py-2.5 text-sm font-semibold"
          >
            {DEVFEST_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="df-label">Avatar</legend>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                aria-pressed={avatar === a}
                aria-label={`Avatar ${a}`}
                className={`df-border flex aspect-square items-center justify-center text-xl transition-colors ${
                  avatar === a ? "df-shadow bg-pastel-yellow" : "bg-white hover:bg-paper"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={busy}
          className="df-btn df-btn-primary w-full text-base disabled:opacity-60"
        >
          {busy ? "Saving…" : "Choose Your Ride →"}
        </button>
      </form>
    </div>
  );
}
