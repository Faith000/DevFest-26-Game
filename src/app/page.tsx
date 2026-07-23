import Link from"next/link";
import { Header } from"@/components/layout/Header";
import { Footer } from"@/components/layout/Footer";
import { GamePreview } from"@/components/landing/GamePreview";
import { TopThree } from"@/components/landing/TopThree";
import { LandingAnalytics } from"@/components/landing/LandingAnalytics";

function TrafficConeIcon() {
 return (
 <svg
 viewBox="0 0 20 20"
 className="h-4 w-4"
 aria-hidden
 focusable="false"
 >
 <path d="M8.2 2.5h3.6l3 13H5.2l3-13Z" fill="#f97316" stroke="#f5f5f5" strokeWidth="1.2" />
 <path d="M7.5 6.5h5M6.5 11h7" stroke="#f5f5f5" strokeWidth="1.6" strokeLinecap="square" />
 <path d="M3.5 17h13" stroke="#f5f5f5" strokeWidth="2" strokeLinecap="square" />
 </svg>
 );
}

export default function Home() {
 return (
 <div className="flex min-h-dvh flex-col">
 <LandingAnalytics />
 <Header />

 <main className="dot-grid sunset-glow relative flex flex-1 items-center overflow-hidden">
 <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr]">
 <div>
 <div className="hero-load hero-load-1 flex flex-wrap items-center gap-2">
 <span className="df-chip">DEVFEST LAGOS · 13–14 NOV 2026</span>
 </div>

 <h1 className="hero-load hero-load-2 mt-6 font-[family-name:var(--font-display)] text-4xl leading-[0.9] font-extrabold tracking-normal uppercase sm:text-6xl">
 Can you beat
 <br />
 Lagos traffic
 <br />
 <span className="hero-stamp mt-4 block w-fit -rotate-3 whitespace-nowrap border-2 border-ink bg-google-blue px-3 pt-1 pb-2 text-[clamp(1.5rem,4vw,3rem)] leading-none sm:mt-5">
 before the keynote?
 </span>
 </h1>

 <div className="hero-load hero-load-3 mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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

 <div className="hero-load hero-load-4 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
 {[
 { icon:"🏎️", label:"Pick a ride" },
 { icon:<TrafficConeIcon />, label:"Dodge traffic" },
 { icon:"🏁", label:"Beat the keynote" },
 { icon:"⏱️", label:"90 seconds" },
 ].map(({ icon, label }, index) => (
 <span key={label} className="df-label flex items-center gap-3 text-ink-soft">
 {index > 0 && <span aria-hidden className="h-1.5 w-1.5 bg-surface-2" />}
 <span className="flex items-center gap-1.5">
 <span aria-hidden className="flex h-4 w-4 items-center justify-center text-sm">
 {icon}
 </span>
 {label}
 </span>
 </span>
 ))}
 </div>
 </div>

 <div className="hero-load hero-load-5 space-y-4">
 <GamePreview />
 <TopThree />
 </div>
 </section>

 <div className="checker-strip checker-strip-white hero-strip-load absolute bottom-0 left-0 w-full" aria-hidden />
 </main>

 <Footer />
 </div>
 );
}
