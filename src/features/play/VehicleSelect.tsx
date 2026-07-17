"use client";

import { useState } from "react";
import type { VehicleId } from "@/types/game";
import { VEHICLES, VEHICLE_IDS } from "@/game/balancing/vehicles";
import { SettingsModal } from "@/features/settings/SettingsModal";

interface Props {
  initial: VehicleId;
  onStart: (vehicle: VehicleId) => void;
  onBack: () => void;
}

/** Small inline vehicle portraits in the site's flat outlined style. */
function VehicleArt({ id }: { id: VehicleId }) {
  if (id === "shuttle") {
    return (
      <svg viewBox="0 0 72 116" className="h-24" role="img" aria-label="DevFest Shuttle van">
        <rect x="8" y="4" width="56" height="108" rx="10" fill="#4285f4" stroke="#1e1e1e" strokeWidth="3" />
        <rect x="14" y="16" width="44" height="15" rx="4" fill="#25313d" />
        <rect x="14" y="38" width="44" height="46" rx="6" fill="#ffffff" stroke="#1e1e1e" strokeWidth="2" />
        {["#ea4335", "#4285f4", "#34a853", "#f9ab00"].map((c, i) => (
          <circle key={c} cx={20 + i * 11} cy="61" r="4.5" fill={c} stroke="#1e1e1e" strokeWidth="1.5" />
        ))}
        <rect x="16" y="92" width="40" height="10" rx="4" fill="#25313d" />
      </svg>
    );
  }
  if (id === "danfo") {
    return (
      <svg viewBox="0 0 76 124" className="h-24" role="img" aria-label="Lagos Danfo bus">
        <rect x="8" y="4" width="60" height="116" rx="10" fill="#f6c445" stroke="#1e1e1e" strokeWidth="3" />
        <rect x="14" y="16" width="48" height="16" rx="4" fill="#25313d" />
        <rect x="8" y="52" width="8" height="32" fill="#141414" />
        <rect x="60" y="52" width="8" height="32" fill="#141414" />
        <rect x="14" y="40" width="48" height="52" rx="6" fill="#f9d16a" stroke="#1e1e1e" strokeWidth="2" />
        <line x1="18" y1="54" x2="58" y2="54" stroke="#1e1e1e" strokeWidth="2" opacity="0.4" />
        <line x1="18" y1="66" x2="58" y2="66" stroke="#1e1e1e" strokeWidth="2" opacity="0.4" />
        <rect x="16" y="100" width="44" height="10" rx="4" fill="#25313d" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 42 88" className="h-24" role="img" aria-label="Delivery bike">
      <rect x="17" y="2" width="8" height="18" rx="4" fill="#141414" />
      <rect x="17" y="66" width="8" height="18" rx="4" fill="#141414" />
      <rect x="15" y="16" width="12" height="52" rx="5" fill="#3d3d44" stroke="#1e1e1e" strokeWidth="2" />
      <rect x="5" y="20" width="32" height="5" rx="2" fill="#141414" />
      <rect x="7" y="56" width="28" height="24" rx="4" fill="#f9ab00" stroke="#1e1e1e" strokeWidth="2" />
      <ellipse cx="21" cy="40" rx="15" ry="11" fill="#2f6fdb" stroke="#1e1e1e" strokeWidth="2" />
      <circle cx="21" cy="34" r="9" fill="#34a853" stroke="#1e1e1e" strokeWidth="2" />
    </svg>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="df-label w-20 shrink-0 text-[9px] text-ink/60">{label}</span>
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
            className={`h-2.5 w-4 border-2 border-ink ${i < value ? "bg-core-green" : "bg-white"}`}
          />
        ))}
      </div>
    </div>
  );
}

const PERKS: Record<VehicleId, string> = {
  shuttle: "Starts with a one-hit shield",
  danfo: "Bigger near-miss bonuses",
  bike: "Slim frame slips through gaps",
};

export function VehicleSelect({ initial, onStart, onBack }: Props) {
  const [selected, setSelected] = useState<VehicleId>(initial);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="df-label text-core-red">GARAGE</p>
      <h1 className="mt-1 font-[family-name:var(--font-grotesk)] text-3xl font-bold">
        Choose your ride
      </h1>
      <p className="mt-2 text-sm text-ink/70">
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
              className={`df-border flex flex-col items-center gap-3 p-4 text-left transition-all ${
                active
                  ? "df-shadow-lg -translate-x-0.5 -translate-y-0.5 bg-pastel-yellow"
                  : "bg-white hover:bg-paper"
              }`}
            >
              <VehicleArt id={id} />
              <div className="w-full">
                <h2 className="font-[family-name:var(--font-grotesk)] text-lg font-bold">
                  {v.name}
                </h2>
                <p className="mt-1 min-h-10 text-xs text-ink/70">{v.description}</p>
                <div className="mt-3 space-y-1.5">
                  <StatBar label="SPEED" value={v.stats.speed} />
                  <StatBar label="HANDLING" value={v.stats.handling} />
                  <StatBar label="TOUGHNESS" value={v.stats.toughness} />
                </div>
                <p className="df-chip mt-3 bg-pastel-blue normal-case tracking-normal">
                  {PERKS[id]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={() => onStart(selected)} className="df-btn df-btn-primary flex-1 text-lg sm:flex-none sm:px-10">
          Start Driving
        </button>
        <button onClick={onBack} className="df-btn df-btn-secondary">
          ← Driver details
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
