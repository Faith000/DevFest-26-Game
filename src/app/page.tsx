import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GamePreview } from "@/components/landing/GamePreview";
import { TopThree } from "@/components/landing/TopThree";
import { LandingAnalytics } from "@/components/landing/LandingAnalytics";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingAnalytics />
      <Header />

      <main className="dot-grid flex flex-1 items-center">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="df-chip bg-pastel-yellow">
              DEVFEST LAGOS · 13–14 NOV 2026
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-grotesk)] text-4xl leading-[1.05] font-bold tracking-tight uppercase sm:text-6xl">
              Can you beat Lagos traffic{" "}
              <span className="text-core-red">before the keynote starts?</span>
            </h1>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/play" className="df-btn df-btn-primary px-10 py-5 text-xl">
                Start Driving →
              </Link>
              <Link href="/leaderboard" className="df-btn df-btn-secondary px-6 py-4">
                View Leaderboard
              </Link>
            </div>

            <p className="df-label mt-7 text-ink/50">
              PICK A RIDE · DODGE LAGOS TRAFFIC · BEAT THE KEYNOTE · 90 SECONDS
            </p>
          </div>

          <div className="space-y-4">
            <GamePreview />
            <TopThree />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
