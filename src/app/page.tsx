import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TickerBar } from "@/components/layout/TickerBar";
import { GamePreview } from "@/components/landing/GamePreview";
import { TopThree } from "@/components/landing/TopThree";
import { LandingAnalytics } from "@/components/landing/LandingAnalytics";
import { site } from "@/config/site";

const STEPS = [
  {
    n: "01",
    bg: "bg-pastel-yellow",
    title: "Pick your ride",
    body: "Shuttle, danfo or delivery bike — three very different ways to argue with traffic.",
  },
  {
    n: "02",
    bg: "bg-pastel-blue",
    title: "Dodge everything",
    body: "Danfos, potholes, production bugs and one extremely confident merge conflict.",
  },
  {
    n: "03",
    bg: "bg-pastel-green",
    title: "Beat the keynote",
    body: "Arrive before the clock hits zero and claim your spot on the weekly leaderboard.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingAnalytics />
      <TickerBar />
      <Header />

      <main className="dot-grid flex-1">
        {/* hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="df-chip bg-pastel-yellow">LAGOS, NIGERIA</span>
              <span className="df-chip bg-core-red text-white">13–14 NOV 2026</span>
              <span className="df-chip bg-pastel-blue">BROWSER GAME</span>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-grotesk)] text-4xl leading-[1.05] font-bold tracking-tight uppercase sm:text-6xl">
              Can you beat Lagos traffic{" "}
              <span className="text-core-red">before the keynote starts?</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink/75 sm:text-lg">
              {site.subline}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/play" className="df-btn df-btn-primary px-8 py-4 text-lg">
                Start Driving
              </Link>
              <Link href="/leaderboard" className="df-btn df-btn-secondary px-6 py-4">
                View Leaderboard
              </Link>
            </div>
            <p className="df-label mt-6 text-ink/50">
              FREE TO PLAY · 90 SECONDS PER RUN · NO DOWNLOAD
            </p>
          </div>

          <div className="space-y-4">
            <GamePreview />
            <TopThree />
          </div>
        </section>

        {/* how it works */}
        <section className="border-y-2 border-ink bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <p className="df-label text-core-red">HOW IT WORKS</p>
            <h2 className="mt-1 font-[family-name:var(--font-grotesk)] text-3xl font-bold">
              Three steps to the venue
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className={`df-border df-shadow p-5 ${s.bg}`}>
                  <p className="df-label">{s.n}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-grotesk)] text-xl font-bold">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink/75">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* event tie-in */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="df-card relative overflow-hidden p-6 sm:p-8">
            <span className="df-chip absolute top-0 right-0 border-t-0 border-r-0 bg-core-red text-white">
              THE REAL EVENT
            </span>
            <p className="df-label text-ink/60">DEVFEST LAGOS · 14TH EDITION</p>
            <h2 className="mt-2 max-w-2xl font-[family-name:var(--font-grotesk)] text-2xl font-bold sm:text-3xl">
              The traffic in this game is fictional. The conference is not.
            </h2>
            <p className="mt-3 max-w-2xl text-ink/75">
              {site.eventName} lands {site.eventDates} — two days of talks,
              workshops and community across AI, cloud, web, mobile and more,
              from Google Developer Groups Lagos.
            </p>
            <a
              href={site.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="df-btn df-btn-primary mt-6"
            >
              Visit devfestlagos.com ↗
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
