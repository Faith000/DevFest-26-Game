/** SSR-safe localStorage JSON helpers. */

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  settings: "eltt:settings",
  profile: "eltt:profile",
  personalBest: "eltt:best",
  pendingRun: "eltt:pending",
  tutorialDone: "eltt:tutorial",
  vehicle: "eltt:vehicle",
} as const;
