import Link from"next/link";
import { Header } from"@/components/layout/Header";
import { Footer } from"@/components/layout/Footer";
import { GamePreview } from"@/components/landing/GamePreview";
import { TopThree } from"@/components/landing/TopThree";
import { LandingAnalytics } from"@/components/landing/LandingAnalytics";

export default function Home() {
 return (
 <div className="flex min-h-dvh flex-col">
 <LandingAnalytics />
 <Header />

 <main className="dot-grid sunset-glow relative flex flex-1 items-center overflow-hidden">
 <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr]">
 <div className="anim-pop-in">
 <div className="flex flex-wrap items-center gap-2">
 <span className="df-chip">DEVFEST LAGOS · 13–14 NOV 2026</span>
 </div>

 <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-6xl">
 Can you beat
 <br />
 Lagos traffic
 <br />
 <span className="mt-1.5 inline-block -rotate-3 whitespace-nowrap border-2 border-ink bg-google-blue px-3 pt-1 pb-2 text-[clamp(1.5rem,4vw,3rem)] leading-none">
 before the keynote?
 </span>
 </h1>

 <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
 <Link
 href="/play"
 className="df-btn df-btn-accent px-10 py-5 text-xl"
 >
 Start Driving →
 </Link>
 <Link href="/leaderboard" className="df-btn df-btn-secondary px-6 py-4">
 View Leaderboard
 </Link>
 </div>

 <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
 {[
 ["🏎️","Pick a ride"],
 ["🐞","Dodge traffic"],
 ["🏁","Beat the keynote"],
 ["⏱️","90 seconds"],
 ].map(([icon, label]) => (
 <span key={label} className="df-label flex items-center gap-1.5 text-ink-soft">
 <span aria-hidden className="text-sm">
 {icon}
 </span>
 {label}
 </span>
 ))}
 </div>
 </div>

 <div className="space-y-4 anim-pop-in">
 <GamePreview />
 <TopThree />
 </div>
 </section>

 <div className="checker-strip absolute bottom-0 left-0 w-full" aria-hidden />
 </main>

 <Footer />
 </div>
 );
}
