"use client";

import { useState } from"react";
import type { VehicleId } from"@/types/game";
import { VEHICLES, VEHICLE_IDS } from"@/game/balancing/vehicles";
import { SettingsModal } from"@/features/settings/SettingsModal";

interface Props {
 initial: VehicleId;
 onStart: (vehicle: VehicleId) => void;
 onBack: () => void;
}

/** Small inline vehicle portraits in the site's flat outlined style. */
function VehicleArt({ id }: { id: VehicleId }) {
 if (id ==="shuttle") {
 return (
 <svg viewBox="0 0 72 116" className="h-24" role="img" aria-label="DevFest Shuttle van">
 <rect x="8" y="4" width="56" height="108" rx="14" fill="#4285f4" stroke="#f5f5f5" strokeWidth="3" />
 <rect x="14" y="16" width="44" height="15" rx="4" fill="#20140d" />
 <rect x="14" y="38" width="44" height="46" rx="8" fill="#f5f5f5" stroke="#141414" strokeWidth="2" />
 {["#ea4335","#4285f4","#fbbc05","#34a853"].map((c, i) => (
 <circle key={c} cx={20 + i * 11} cy="61" r="4.5" fill={c} stroke="#141414" strokeWidth="1.5" />
 ))}
 <rect x="16" y="92" width="40" height="10" rx="5" fill="#20140d" />
 </svg>
 );
 }
 if (id ==="danfo") {
 return (
 <svg viewBox="0 0 76 124" className="h-24" role="img" aria-label="Lagos Danfo bus">
 <rect x="8" y="4" width="60" height="116" rx="14" fill="#fbbc05" stroke="#f5f5f5" strokeWidth="3" />
 <rect x="14" y="16" width="48" height="16" rx="4" fill="#20140d" />
 <rect x="8" y="52" width="8" height="32" fill="#20140d" />
 <rect x="60" y="52" width="8" height="32" fill="#20140d" />
 <rect x="14" y="40" width="48" height="52" rx="8" fill="#fff3b0" stroke="#141414" strokeWidth="2" />
 <line x1="18" y1="54" x2="58" y2="54" stroke="#141414" strokeWidth="2" opacity="0.5" />
 <line x1="18" y1="66" x2="58" y2="66" stroke="#141414" strokeWidth="2" opacity="0.5" />
 <rect x="16" y="100" width="44" height="10" rx="5" fill="#20140d" />
 </svg>
 );
 }
 return (
 <svg viewBox="0 0 42 88" className="h-24" role="img" aria-label="Delivery bike">
 <rect x="17" y="2" width="8" height="18" rx="4" fill="#20140d" />
 <rect x="17" y="66" width="8" height="18" rx="4" fill="#20140d" />
 <rect x="15" y="16" width="12" height="52" rx="5" fill="#ea4335" stroke="#f5f5f5" strokeWidth="2" />
 <rect x="5" y="20" width="32" height="5" rx="2" fill="#20140d" />
 <rect x="7" y="56" width="28" height="24" rx="6" fill="#fbbc05" stroke="#141414" strokeWidth="2" />
 <ellipse cx="21" cy="40" rx="15" ry="11" fill="#4285f4" stroke="#f5f5f5" strokeWidth="2" />
 <circle cx="21" cy="34" r="9" fill="#34a853" stroke="#141414" strokeWidth="2" />
 </svg>
 );
}

function StatBar({ label, value }: { label: string; value: number }) {
 return (
 <div className="flex items-center gap-2">
 <span className="df-label w-20 shrink-0 text-[9px] text-ink-soft">{label}</span>
 <div
 className="flex gap-1"
 role="meter"
 aria-valuenow={value}
 aria-valuemin={0}
 aria-valuemax={5}
 aria-label={`${label}: ${value} out of 5`}
 >
 {Array.from({ length: 5 }).map((_, i) => (
 <span
 key={i}
 className={`h-2.5 w-4 border-2 border-ink ${i < value ?"bg-core-green" :"bg-paper"}`}
 />
 ))}
 </div>
 </div>
 );
}

const PERKS: Record<VehicleId, string> = {
 shuttle:"Starts with a one-hit shield",
 danfo:"Bigger near-miss bonuses",
 bike:"Slim frame slips through gaps",
};

// Bold Google-colour panels behind each portrait.
const VEHICLE_TINT: Record<VehicleId, string> = {
 shuttle:"bg-google-blue",
 danfo:"bg-google-yellow",
 bike:"bg-google-green",
};

const SELECTED_PERK: Record<VehicleId, string> = {
 shuttle:"bg-google-blue text-white",
 danfo:"bg-google-yellow text-paper-deep",
 bike:"bg-google-green text-white",
};

export function VehicleSelect({ initial, onStart, onBack }: Props) {
 const [selected, setSelected] = useState<VehicleId>(initial);
 const [showSettings, setShowSettings] = useState(false);

 return (
 <div className="anim-pop-in mx-auto w-full max-w-3xl px-4 py-10">
 <button
 type="button"
 onClick={onBack}
 className="df-btn df-btn-secondary mb-6 px-4 py-2 text-sm"
 >
 ← Back
 </button>

 <p className="df-label text-core-red">The Garage</p>
 <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
 Choose your ride
 </h1>
 <p className="mt-2 text-sm text-ink-soft">
 Three very different ways to be late. Pick one and prove them wrong.
 </p>

 <div className="mt-6 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Vehicle">
 {VEHICLE_IDS.map((id) => {
 const v = VEHICLES[id];
 const active = selected === id;
 return (
 <button
 key={id}
 role="radio"
 aria-checked={active}
 onClick={() => setSelected(id)}
 className={`df-border relative flex flex-col overflow-hidden text-left transition-all ${
 active
 ?"df-shadow-lg -translate-y-1"
 :"df-shadow hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_rgba(43,27,18,0.35)]"
 }`}
 >
 {active && (
 <span className="df-chip absolute top-2 right-2 z-10 bg-google-red px-1.5 py-0 text-[9px] text-white">
 ✓
 </span>
 )}
 <div
 className={`flex items-center justify-center border-b border-ink/10 py-4 ${VEHICLE_TINT[id]}`}
 >
 <VehicleArt id={id} />
 </div>
 <div className={`w-full flex-1 p-4 ${active ?"bg-surface-2 text-ink" :"bg-surface"}`}>
 <h2 className="font-[family-name:var(--font-grotesk)] text-lg font-bold">
 {v.name}
 </h2>
 <p className="mt-1 min-h-10 text-xs text-ink-soft">{v.description}</p>
 <div className="mt-3 space-y-1.5">
 <StatBar label="SPEED" value={v.stats.speed} />
 <StatBar label="HANDLING" value={v.stats.handling} />
 <StatBar label="TOUGHNESS" value={v.stats.toughness} />
 </div>
 <p className={`df-chip mt-3 border-transparent normal-case tracking-normal ${active ?SELECTED_PERK[id] :"bg-surface-2 text-ink-soft"}`}>
 {PERKS[id]}
 </p>
 </div>
 </button>
 );
 })}
 </div>

 <div className="mt-6 flex flex-wrap items-center gap-3">
 <button onClick={() => onStart(selected)} className="df-btn df-btn-accent flex-1 py-4 text-lg sm:flex-none sm:px-12">
 Start Driving →
 </button>
 <button
 onClick={() => setShowSettings(true)}
 aria-label="Sound and accessibility settings"
 className="df-btn df-btn-secondary"
 >
 ⚙ Settings
 </button>
 </div>
 {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
 </div>
 );
}
