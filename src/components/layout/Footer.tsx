import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-grotesk)] text-lg font-bold">
            Escape the Lagos Tech Traffic
          </p>
          <p className="mt-1 max-w-md text-sm text-white/70">
            A fan-made promotional game for {site.eventName}, the Google
            Developer Groups Lagos community-led tech conference.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={site.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="df-label text-white underline-offset-4 hover:underline"
          >
            DEVFESTLAGOS.COM ↗
          </a>
          <p className="font-[family-name:var(--font-mono-df)] text-[11px] tracking-wider text-white/50">
            © 2026 GDG LAGOS · GAME BUILT WITH ❤ IN THE COMMUNITY
          </p>
        </div>
      </div>
    </footer>
  );
}
