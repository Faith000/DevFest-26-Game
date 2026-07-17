"use client";

import { useEffect } from "react";
import { track } from "@/services/analytics";

/** Fires the landing_viewed event once per visit. Renders nothing. */
export function LandingAnalytics() {
  useEffect(() => {
    track("landing_viewed");
  }, []);
  return null;
}
