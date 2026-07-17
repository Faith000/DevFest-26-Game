"use client";

import { useEffect, useRef } from "react";
import { useSettings, type AppSettings } from "./useSettings";
import { gameAudio } from "@/game/systems/audio";

interface Props {
  onClose: () => void;
}

const OPTIONS: Array<{
  key: keyof AppSettings;
  label: string;
  hint: string;
}> = [
  { key: "music", label: "Music", hint: "Background driving groove" },
  { key: "sfx", label: "Sound effects", hint: "Engine, pickups, collisions" },
  { key: "reducedMotion", label: "Reduced motion", hint: "Fewer particles, no shake or tilt" },
  { key: "highContrast", label: "High contrast", hint: "Stronger borders and colours" },
  { key: "largeUi", label: "Larger interface", hint: "Bigger text and game HUD" },
];

export function SettingsModal({ onClose }: Props) {
  const { settings, update } = useSettings();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (key: keyof AppSettings) => {
    const next = !settings[key];
    update({ [key]: next });
    if (key === "music") gameAudio.setMusicOn(next);
    if (key === "sfx") gameAudio.setSfxOn(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="df-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="font-[family-name:var(--font-grotesk)] text-2xl font-bold">
            Settings
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close settings"
            className="df-border df-shadow bg-white px-3 py-1 font-bold"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {OPTIONS.map((o) => (
            <li key={o.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-grotesk)] font-bold">{o.label}</p>
                <p className="text-xs text-ink/60">{o.hint}</p>
              </div>
              <button
                role="switch"
                aria-checked={settings[o.key]}
                aria-label={o.label}
                onClick={() => toggle(o.key)}
                className={`df-border relative h-8 w-14 shrink-0 transition-colors ${
                  settings[o.key] ? "bg-core-green" : "bg-paper"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 border-2 border-ink bg-white transition-all ${
                    settings[o.key] ? "left-[26px]" : "left-0.5"
                  }`}
                />
                <span className="sr-only">{settings[o.key] ? "On" : "Off"}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-ink/50">
          Saved on this device. Reduced motion follows your system preference
          by default.
        </p>
      </div>
    </div>
  );
}
