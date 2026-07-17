/**
 * Difficulty director.
 *
 * Owns the spawn schedule and the fairness guarantee: it maintains a "safe
 * lane" that random-walks by at most one lane per obstacle row. The safe
 * lane's corridor is never blocked, and when it shifts, the row keeps both
 * the old and new safe lanes clear so the diagonal escape route always
 * exists. Big set-piece obstacles (bug crossings, merges, weaving okadas)
 * reserve extra clear road before and after themselves.
 *
 * The director is deliberately pure logic — the scene executes commands.
 */
import type { CollectibleKind, PowerUpKind } from "@/types/game";
import { RUN, beatForProgress } from "../balancing/run";
import { LANE_COUNT } from "../constants";

export type StaticKind =
  | "pothole"
  | "constructionBarrier"
  | "brokenDownCar"
  | "loadingSpinner"
  | "expiredApiKey"
  | "figmaLayers";

export type SpawnCommand =
  | { type: "static"; kind: StaticKind; lane: number }
  | { type: "truck"; lane: number }
  | { type: "danfo"; lane: number; toLane: number | null }
  | { type: "okada"; laneA: number; laneB: number }
  | { type: "bug"; fromLeft: boolean }
  | { type: "merge"; stayLane: number; mergeLane: number }
  | { type: "deploy"; leftLane: number }
  | { type: "collectLine"; lane: number; kind: Exclude<CollectibleKind, "badge">; count: number }
  | { type: "badge"; lane: number }
  | { type: "powerup"; lane: number; kind: PowerUpKind };

export interface DirectorReport {
  /** lanes currently occupied by slow movers between spawn and player */
  slowMoverLanes: Set<number>;
  /** a set-piece (okada/bug/merge/deploy) is still on screen */
  specialAlive: boolean;
}

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export class Director {
  safeLane = 1;

  private nextRowAt = 620;
  private nextCollectAt = 320;
  private nextPowerupAt = 2600;
  private nextBadgeAt = 9000;
  private lastRowAt = 0;
  private lastRowBlocked: number[] = [];
  private powerupBag: PowerUpKind[] = [];

  /** road speed in px/s for a given elapsed game time */
  speedFor(elapsedSec: number): number {
    const t = Math.max(0, elapsedSec - 5);
    const k = Math.min(1, t / RUN.rampSeconds);
    return RUN.baseSpeed + (RUN.maxSpeed - RUN.baseSpeed) * Math.pow(k, 0.9);
  }

  /** 0..1 pressure used for spawn decisions */
  difficulty(elapsedSec: number): number {
    const t = Math.max(0, elapsedSec - RUN.warmupSeconds);
    return Math.min(1, t / RUN.rampSeconds);
  }

  update(
    scrolledPx: number,
    elapsedSec: number,
    progress: number,
    report: DirectorReport,
  ): SpawnCommand[] {
    const out: SpawnCommand[] = [];
    const beat = beatForProgress(progress);
    // Stop feeding hazards just before the gate so the arrival reads clean.
    const nearGoal = progress > 0.94;

    if (!nearGoal && scrolledPx >= this.nextRowAt) {
      out.push(...this.spawnRow(scrolledPx, elapsedSec, beat === "rain", report));
    }

    if (scrolledPx >= this.nextCollectAt) {
      out.push(this.spawnCollectLine(scrolledPx));
      this.nextCollectAt = scrolledPx + rnd(900, 1500);
    }

    if (!nearGoal && scrolledPx >= this.nextPowerupAt) {
      out.push({ type: "powerup", lane: this.safeLane, kind: this.nextPowerup() });
      this.nextPowerupAt = scrolledPx + rnd(3600, 5400);
    }

    if (!nearGoal && scrolledPx >= this.nextBadgeAt) {
      out.push({ type: "badge", lane: this.safeLane });
      this.nextBadgeAt = scrolledPx + rnd(8000, 12000);
    }

    return out;
  }

  private nextPowerup(): PowerUpKind {
    if (this.powerupBag.length === 0) {
      this.powerupBag = ["coffee", "cloudShield", "stableWifi", "geminiAssist"];
      // shuffle
      for (let i = this.powerupBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.powerupBag[i], this.powerupBag[j]] = [this.powerupBag[j], this.powerupBag[i]];
      }
    }
    return this.powerupBag.pop()!;
  }

  private lanes(): number[] {
    return Array.from({ length: LANE_COUNT }, (_, i) => i);
  }

  private spawnRow(
    scrolled: number,
    elapsed: number,
    raining: boolean,
    report: DirectorReport,
  ): SpawnCommand[] {
    const d = this.difficulty(elapsed);
    const spacing = (500 - 90 * d) * (raining ? 1.15 : 1);
    const out: SpawnCommand[] = [];

    // Maybe shift the safe lane (never into a slow mover's lane, never
    // while a set-piece is on screen).
    const oldSafe = this.safeLane;
    let transition = false;
    if (!report.specialAlive && Math.random() < 0.32 + 0.3 * d) {
      const candidates = [this.safeLane - 1, this.safeLane + 1].filter(
        (l) => l >= 0 && l < LANE_COUNT && !report.slowMoverLanes.has(l),
      );
      if (candidates.length > 0) {
        this.safeLane = pick(candidates);
        transition = this.safeLane !== oldSafe;
      }
    }

    const nonSafe = this.lanes().filter((l) => l !== this.safeLane);
    let gapMult = 1;

    if (transition) {
      // keep both old and new safe lanes clear; block only the third lane
      const blockable = this.lanes().filter((l) => l !== this.safeLane && l !== oldSafe);
      if (blockable.length > 0) {
        const lane = blockable[0];
        out.push({ type: "static", kind: this.pickStatic(elapsed), lane });
        this.lastRowBlocked = [lane];
      } else {
        this.lastRowBlocked = [];
      }
    } else {
      const truckBusy = report.slowMoverLanes.size > 0;
      const weights: Array<[string, number]> = [
        ["empty", Math.max(0.15, 1.1 - 1.4 * d)],
        ["single", 3],
        ["double", d > 0.3 ? 1.8 * d : 0],
        ["truck", truckBusy ? 0 : 0.9],
        ["danfo", elapsed > 10 ? 1.1 : 0],
        ["okada", elapsed > 18 && !report.specialAlive ? 0.75 : 0],
        ["bug", elapsed > 28 && !report.specialAlive ? 0.65 : 0],
        ["merge", d > 0.42 && !report.specialAlive ? 0.6 : 0],
        ["deploy", d > 0.55 && !report.specialAlive ? 0.55 : 0],
      ];
      const total = weights.reduce((s, [, w]) => s + w, 0);
      let roll = Math.random() * total;
      let choice = "single";
      for (const [name, w] of weights) {
        roll -= w;
        if (roll <= 0) {
          choice = name;
          break;
        }
      }

      this.lastRowBlocked = [];
      switch (choice) {
        case "empty":
          break;
        case "single": {
          const lane = pick(nonSafe);
          out.push({ type: "static", kind: this.pickStatic(elapsed), lane });
          this.lastRowBlocked = [lane];
          break;
        }
        case "double": {
          for (const lane of nonSafe) {
            out.push({ type: "static", kind: this.pickStatic(elapsed), lane });
          }
          this.lastRowBlocked = [...nonSafe];
          gapMult = 1.2;
          break;
        }
        case "truck": {
          const lane = pick(nonSafe);
          out.push({ type: "truck", lane });
          this.lastRowBlocked = [lane];
          gapMult = 1.35;
          break;
        }
        case "danfo": {
          const lane = pick(nonSafe);
          // above ~35% pressure the danfo swings into the other non-safe lane
          const other = nonSafe.find((l) => l !== lane) ?? null;
          const moves = d > 0.35 && other !== null && !report.slowMoverLanes.has(other);
          out.push({ type: "danfo", lane, toLane: moves ? other : null });
          this.lastRowBlocked = moves && other !== null ? [lane, other] : [lane];
          gapMult = 1.25;
          break;
        }
        case "okada": {
          out.push({ type: "okada", laneA: nonSafe[0], laneB: nonSafe[1] });
          this.lastRowBlocked = [...nonSafe];
          gapMult = 1.75;
          break;
        }
        case "bug": {
          out.push({ type: "bug", fromLeft: Math.random() < 0.5 });
          this.lastRowBlocked = [];
          gapMult = 1.9;
          break;
        }
        case "merge": {
          const [a, b] = nonSafe;
          const stay = Math.random() < 0.5 ? a : b;
          out.push({ type: "merge", stayLane: stay, mergeLane: stay === a ? b : a });
          this.lastRowBlocked = [...nonSafe];
          gapMult = 1.7;
          break;
        }
        case "deploy": {
          // zone spans the two non-safe lanes when adjacent; otherwise a
          // single-lane fallback barrier keeps things fair
          if (Math.abs(nonSafe[0] - nonSafe[1]) === 1) {
            out.push({ type: "deploy", leftLane: Math.min(nonSafe[0], nonSafe[1]) });
            this.lastRowBlocked = [...nonSafe];
            gapMult = 1.65;
          } else {
            const lane = pick(nonSafe);
            out.push({ type: "static", kind: "constructionBarrier", lane });
            this.lastRowBlocked = [lane];
          }
          break;
        }
      }
    }

    this.lastRowAt = scrolled;
    this.nextRowAt = scrolled + spacing * gapMult;
    return out;
  }

  private pickStatic(elapsed: number): StaticKind {
    const pool: Array<[StaticKind, number]> = [
      ["pothole", 1.2],
      ["constructionBarrier", 1.1],
      ["brokenDownCar", elapsed > 8 ? 1 : 0],
      ["loadingSpinner", elapsed > 15 ? 1 : 0],
      ["figmaLayers", elapsed > 22 ? 0.9 : 0],
      ["expiredApiKey", elapsed > 28 ? 0.9 : 0],
    ];
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [kind, w] of pool) {
      roll -= w;
      if (roll <= 0) return kind;
    }
    return "pothole";
  }

  private spawnCollectLine(scrolled: number): SpawnCommand {
    // Prefer the safe corridor; sometimes tempt the player sideways.
    let lane = this.safeLane;
    if (Math.random() < 0.35) {
      const recentBlock = scrolled - this.lastRowAt < 380 ? this.lastRowBlocked : [];
      const options = this.lanes().filter((l) => !recentBlock.includes(l));
      lane = pick(options);
    }
    const kind = pick<Exclude<CollectibleKind, "badge">>(["star", "codeToken", "wifi"]);
    return { type: "collectLine", lane, kind, count: 3 + Math.floor(Math.random() * 2) };
  }
}
