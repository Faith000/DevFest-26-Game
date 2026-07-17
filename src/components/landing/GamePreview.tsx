/**
 * Pure-CSS animated preview of the game for the hero. Decorative only —
 * animations are globally disabled under reduced-motion preferences.
 */
export function GamePreview() {
  return (
    <div
      className="df-card relative mx-auto h-[420px] w-full max-w-[300px] overflow-hidden"
      role="img"
      aria-label="Animated preview: a DevFest shuttle dodging danfos and potholes on a three-lane Lagos road"
    >
      {/* roadside */}
      <div className="absolute inset-y-0 left-0 w-8 bg-[#d9cfae]" />
      <div className="absolute inset-y-0 right-0 w-8 bg-[#d9cfae]" />
      <span className="absolute top-6 left-1 text-lg" aria-hidden>🌴</span>
      <span className="absolute top-40 right-0.5 text-lg" aria-hidden>🌴</span>
      <span className="absolute top-72 left-1 text-lg" aria-hidden>🏪</span>

      {/* road with scrolling dashes */}
      <div
        className="absolute inset-y-0 right-8 left-8 border-x-4 border-ink/80 bg-[#3a3a3f]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, #e8e4da 0 34px, transparent 34px 96px), linear-gradient(to bottom, #e8e4da 0 34px, transparent 34px 96px)",
          backgroundSize: "5px 96px, 5px 96px",
          backgroundPosition: "33.3% 0, 66.6% 0",
          backgroundRepeat: "repeat-y, repeat-y",
          animation: "road-scroll 0.7s linear infinite",
        }}
      />

      {/* oncoming traffic */}
      <span
        className="absolute left-[52px] text-3xl"
        style={{ animation: "preview-traffic 2.6s linear infinite" }}
        aria-hidden
      >
        🚌
      </span>
      <span
        className="absolute left-[190px] text-2xl"
        style={{ animation: "preview-traffic 3.1s linear 1.2s infinite" }}
        aria-hidden
      >
        🐞
      </span>
      <span
        className="absolute left-[120px] text-2xl"
        style={{ animation: "preview-traffic 2.9s linear 0.6s infinite" }}
        aria-hidden
      >
        🚧
      </span>

      {/* player */}
      <div
        className="absolute bottom-10 left-[150px]"
        style={{ animation: "preview-dodge 4.2s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 72 116" className="h-20 drop-shadow-[0_6px_4px_rgba(0,0,0,0.3)]" aria-hidden>
          <rect x="8" y="4" width="56" height="108" rx="10" fill="#4285f4" stroke="#1e1e1e" strokeWidth="3" />
          <rect x="14" y="16" width="44" height="15" rx="4" fill="#25313d" />
          <rect x="14" y="38" width="44" height="46" rx="6" fill="#ffffff" stroke="#1e1e1e" strokeWidth="2" />
          {["#ea4335", "#4285f4", "#34a853", "#f9ab00"].map((c, i) => (
            <circle key={c} cx={20 + i * 11} cy="61" r="4.5" fill={c} stroke="#1e1e1e" strokeWidth="1.5" />
          ))}
          <rect x="16" y="92" width="40" height="10" rx="4" fill="#25313d" />
        </svg>
      </div>

      {/* HUD chrome */}
      <div className="df-border absolute top-3 left-3 bg-white px-2 py-1">
        <p className="font-[family-name:var(--font-mono-df)] text-[8px] font-bold tracking-wider">SCORE</p>
        <p className="font-[family-name:var(--font-grotesk)] text-sm leading-none font-bold">12,480</p>
      </div>
      <div className="df-border absolute top-3 right-3 bg-ink px-2 py-1.5">
        <p className="font-[family-name:var(--font-mono-df)] text-[9px] font-bold tracking-wider text-white">
          KEYNOTE 00:47
        </p>
      </div>
      <div
        className="df-border absolute bottom-3 left-3 bg-pastel-yellow px-2 py-1"
        style={{ animation: "preview-bob 2s ease-in-out infinite" }}
      >
        <p className="font-[family-name:var(--font-mono-df)] text-[9px] font-bold tracking-wider">
          +100 NEAR MISS
        </p>
      </div>
    </div>
  );
}
