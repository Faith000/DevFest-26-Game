const ITEMS = [
  { dot: "bg-core-green", text: "THE KEYNOTE WAITS FOR NO ONE" },
  { dot: "bg-core-amber", text: "13–14 NOVEMBER 2026 · DEVFEST LAGOS" },
  { dot: "bg-core-red", text: "DANFOS SPOTTED ON THE EXPRESS" },
  { dot: "bg-core-blue", text: "NEW: WEEKLY LEADERBOARD IS LIVE" },
];

/** Site-style black ticker. Duplicated track = seamless marquee. */
export function TickerBar() {
  const row = (hidden: boolean) => (
    <div
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {ITEMS.map((item) => (
        <span
          key={item.text}
          className="flex items-center gap-2 font-[family-name:var(--font-mono-df)] text-[11px] font-bold tracking-wider whitespace-nowrap text-white"
        >
          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
          {item.text}
          <span className="ml-6 text-white/40">|</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden bg-ink py-2">
      <div className="ticker-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
