/**
 * Minimal product analytics. Events are fire-and-forget via sendBeacon so
 * they can never block or slow gameplay. Failures are swallowed.
 */

export type AnalyticsEvent =
  | "landing_viewed"
  | "game_started"
  | "vehicle_selected"
  | "run_started"
  | "run_completed"
  | "run_failed"
  | "personal_best_achieved"
  | "score_submission_started"
  | "score_submitted"
  | "leaderboard_viewed"
  | "play_again_clicked"
  | "result_shared"
  | "devfest_link_clicked";

type Params = Record<string, string | number | boolean | null | undefined>;

function deviceCategory(): string {
  if (typeof window === "undefined") return "unknown";
  return window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop";
}

export function track(event: AnalyticsEvent, params: Params = {}): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      params: { ...params, device: deviceCategory() },
      ts: Date.now(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the game */
  }
}
