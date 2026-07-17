import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TickerBar } from "@/components/layout/TickerBar";
import { LeaderboardView } from "@/features/leaderboard/LeaderboardView";

export const metadata: Metadata = {
  title: "Leaderboard — Escape the Lagos Tech Traffic",
};

export default function LeaderboardPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TickerBar />
      <Header />
      <main className="dot-grid flex-1">
        <LeaderboardView />
      </main>
      <Footer />
    </div>
  );
}
