/**
 * Small in-memory sliding-window limiter. Per-process, which is fine for
 * this deployment shape; swap for a shared store if the app ever scales
 * horizontally.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  let hits = buckets.get(key);
  if (!hits) {
    hits = [];
    buckets.set(key, hits);
  }
  while (hits.length > 0 && hits[0] < cutoff) hits.shift();
  if (hits.length >= limit) return false;
  hits.push(now);
  // opportunistic cleanup so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || v[v.length - 1] < cutoff) buckets.delete(k);
    }
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}
