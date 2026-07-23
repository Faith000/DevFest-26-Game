import { site } from"@/config/site";

export function Footer() {
 return (
 <footer className="bg-paper-deep text-white">
 <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-9 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
 Escape the Lagos Tech Traffic
 </p>
 <p className="mt-2 max-w-md text-sm text-white/60">
 A promotional game for {site.eventName}, the Google Developer Groups
 Lagos community-led tech conference.
 </p>
 </div>
 <div className="flex flex-col gap-2.5 sm:items-end">
 <a
 href={site.officialUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="df-label inline-flex w-fit items-center gap-1.5 border-2 border-white/70 px-4 py-2 text-white transition-colors hover:bg-white hover:text-paper-deep"
 >
 DEVFESTLAGOS.COM ↗
 </a>
 <p className="font-[family-name:var(--font-mono-df)] text-[11px] tracking-wider text-white/45">
 © 2026 GDG LAGOS · BUILT WITH ❤ IN THE COMMUNITY
 </p>
 </div>
 </div>
 </footer>
 );
}
