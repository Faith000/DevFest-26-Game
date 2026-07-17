import type { Metadata } from "next";
import { PlayFlow } from "@/features/play/PlayFlow";

export const metadata: Metadata = {
  title: "Play — Escape the Lagos Tech Traffic",
};

export default function PlayPage() {
  return <PlayFlow />;
}
