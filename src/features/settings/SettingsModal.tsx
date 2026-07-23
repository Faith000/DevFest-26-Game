"use client";

import { useEffect, useRef } from"react";
import { createPortal } from"react-dom";
import { useSettings, type AppSettings } from"./useSettings";
import { gameAudio } from"@/game/systems/audio";

interface Props {
 onClose: () => void;
}

const OPTIONS: Array<{
 key: keyof AppSettings;
 label: string;
 hint: string;
}> = [
 { key:"music", label:"Music", hint:"Background driving groove" },
 { key:"sfx", label:"Sound effects", hint:"Engine, pickups, collisions" },
 { key:"reducedMotion", label:"Reduced motion", hint:"Fewer particles, no shake or tilt" },
 { key:"highContrast", label:"High contrast", hint:"Stronger borders and colours" },
 { key:"largeUi", label:"Larger interface", hint:"Bigger text and game HUD" },
];

export function SettingsModal({ onClose }: Props) {
 const { settings, update } = useSettings();
 const closeRef = useRef<HTMLButtonElement>(null);

 useEffect(() => {
 const onKey = (e: KeyboardEvent) => {
 if (e.key ==="Escape") onClose();
 };
 window.addEventListener("keydown", onKey);
 return () => window.removeEventListener("keydown", onKey);
 }, [onClose]);

 useEffect(() => {
 closeRef.current?.focus();
 }, []);

 const toggle = (key: keyof AppSettings) => {
 const next = !settings[key];
 update({ [key]: next });
 if (key ==="music") gameAudio.setMusicOn(next);
 if (key ==="sfx") gameAudio.setSfxOn(next);
 };

 if (typeof document ==="undefined") return null;

 return createPortal(
 <div
 className="anim-pop-in fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-6"
 role="dialog"
 aria-modal="true"
 aria-labelledby="settings-title"
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
 >
 <div className="df-card df-shadow-lg my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden border-ink/35">
 <div className="flex shrink-0 items-center justify-between border-b border-ink/15 bg-surface-2 px-5 py-4">
 <h2
 id="settings-title"
 className="font-[family-name:var(--font-display)] text-2xl font-semibold"
 >
 Settings
 </h2>
 <button
 ref={closeRef}
 onClick={onClose}
 aria-label="Close settings"
 className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-surface font-bold transition-colors hover:bg-core-red hover:text-white"
 >
 ✕
 </button>
 </div>

 <div className="overflow-y-auto p-5">
 <ul className="space-y-3">
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
 className={`relative h-8 w-14 shrink-0 border-2 border-ink transition-colors ${
 settings[o.key] ?"bg-core-green" :"bg-paper"
 }`}
 >
 <span
 className={`absolute top-0.5 h-6 w-6 border-2 border-ink bg-ink transition-all ${
 settings[o.key] ?"left-[26px]" :"left-0.5"
 }`}
 />
 <span className="sr-only">{settings[o.key] ?"On" :"Off"}</span>
 </button>
 </li>
 ))}
 </ul>

 <p className="mt-4 text-xs text-ink-soft">
 Saved on this device. Reduced motion follows your system preference
 by default.
 </p>
 </div>
 </div>
 </div>,
 document.body,
 );
}
