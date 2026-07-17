import * as Phaser from "phaser";
import type {
  CollectibleKind,
  ObstacleKind,
  PowerUpKind,
  RunResult,
  RunStats,
  VehicleSpec,
} from "@/types/game";
import { VEHICLES } from "../balancing/vehicles";
import { RUN, beatForProgress, type RouteBeat } from "../balancing/run";
import { SCORING, comboMultiplier, computeScore } from "../balancing/scoring";
import { GAME_VERSION, SCORING_VERSION } from "@/config/version";
import { palette } from "@/config/theme";
import {
  DEPTH,
  DESPAWN_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  LANE_COUNT,
  LANE_WIDTH,
  PLAYER_Y,
  ROAD_LEFT,
  ROAD_WIDTH,
  SPAWN_Y,
  laneX,
} from "../constants";
import { Director, type SpawnCommand } from "../systems/director";
import { gameAudio } from "../systems/audio";
import type { GameSettings, RunSceneConfig } from "../types";

interface Obstacle {
  kind: ObstacleKind;
  node: Phaser.GameObjects.Container;
  lane: number;
  halfW: number;
  halfH: number;
  /** forward speed of the vehicle itself (fraction of road speed) */
  ownSpeedFrac: number;
  passed: boolean;
  hit: boolean;
  minGap: number;
  special: boolean;
  slowMover: boolean;
  data?: Record<string, number | boolean>;
  onUpdate?: (o: Obstacle, dt: number, roadSpeed: number) => void;
}

interface Pickup {
  kind: CollectibleKind | "powerup";
  power?: PowerUpKind;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  halfW: number;
  halfH: number;
  collected: boolean;
}

interface RoadsideProp {
  node: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  drift: number;
}

const VEHICLE_TEXTURE: Record<string, string> = {
  shuttle: "veh-shuttle",
  danfo: "veh-danfo",
  bike: "veh-bike",
};

const MONO = '"Space Mono", monospace';

/** subtle top-down depth: things far up the road render slightly smaller */
const depthScale = (y: number): number =>
  0.82 + 0.18 * Phaser.Math.Clamp(y / PLAYER_Y, 0, 1.15);

export class RunScene extends Phaser.Scene {
  private cfg!: RunSceneConfig;
  private vehicle!: VehicleSpec;
  private settings!: GameSettings;

  // world
  private roadA!: Phaser.GameObjects.TileSprite;
  private roadB!: Phaser.GameObjects.TileSprite;
  private currentRoadKey = "road-day";
  private ambient!: Phaser.GameObjects.Rectangle;
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // player
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private shieldSprite!: Phaser.GameObjects.Image;
  private lane = 1;
  private targetLane = 1;
  private laneTween: Phaser.Tweens.Tween | null = null;
  private playerHalfW = 32;
  private playerHalfH = 50;

  // run state
  private state: "intro" | "running" | "arriving" | "ending" | "done" = "intro";
  private elapsed = 0;
  private scrolledPx = 0;
  private keynoteRemaining = RUN.keynoteSeconds;
  private integrity = RUN.maxIntegrity;
  private shielded = false;
  private invuln = 0;
  private hitSlow = 0;

  // effects state
  private storedPower: PowerUpKind | null = null;
  private coffeeTimer = 0;
  private wifiTimer = 0;
  private geminiTimer = 0;
  private laneGlow!: Phaser.GameObjects.Image;

  // stats
  private stats!: RunStats;
  private comboCount = 0;
  private dodges = 0;
  private lastBeat: RouteBeat = "morning";
  private lastCountdownBeep = -1;
  private liveScore = 0;
  private liveScoreTimer = 0;

  private director = new Director();
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private roadside: RoadsideProp[] = [];
  private nextRoadsideAt = 0;
  private pickupPool = new Map<string, Phaser.GameObjects.Image[]>();
  private popupPool: Phaser.GameObjects.Text[] = [];

  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeConsumedAt = 0;
  private swipeActive = false;

  /** dev/testing aid (?autopilot): follow the director's safe corridor */
  private autopilot = false;
  private autopilotTimer = 0;

  constructor() {
    super("run");
  }

  init(cfg: RunSceneConfig): void {
    this.cfg = cfg;
    this.vehicle = VEHICLES[cfg.vehicleId];
    this.settings = cfg.settings;
    // full reset (restart-safe)
    this.state = "intro";
    this.elapsed = 0;
    this.scrolledPx = 0;
    this.keynoteRemaining = RUN.keynoteSeconds;
    this.integrity = RUN.maxIntegrity;
    this.shielded = this.vehicle.startingShield;
    this.invuln = 0;
    this.hitSlow = 0;
    this.storedPower = null;
    this.coffeeTimer = 0;
    this.wifiTimer = 0;
    this.geminiTimer = 0;
    this.comboCount = 0;
    this.dodges = 0;
    this.lastBeat = "morning";
    this.lastCountdownBeep = -1;
    this.liveScore = 0;
    this.liveScoreTimer = 0;
    this.currentRoadKey = "road-day";
    this.lane = 1;
    this.targetLane = 1;
    this.laneTween = null;
    this.rainEmitter = null;
    this.director = new Director();
    this.obstacles = [];
    this.pickups = [];
    this.roadside = [];
    this.nextRoadsideAt = 0;
    this.pickupPool = new Map();
    this.popupPool = [];
    this.stats = {
      sessionId: crypto.randomUUID(),
      vehicleId: cfg.vehicleId,
      startedAt: Date.now(),
      endedAt: 0,
      result: "abandoned",
      distance: 0,
      remainingTime: RUN.keynoteSeconds,
      collisions: 0,
      nearMisses: 0,
      dodges: 0,
      collectibles: { star: 0, codeToken: 0, wifi: 0, badge: 0 },
      highestCombo: 0,
      comboScore: 0,
      gameVersion: GAME_VERSION,
      scoringVersion: SCORING_VERSION,
    };
  }

  create(): void {
    this.roadA = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, "road-day")
      .setDepth(DEPTH.road);
    this.roadB = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, "road-wet")
      .setDepth(DEPTH.road + 0.1)
      .setAlpha(0);

    // warm morning light
    this.ambient = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffc46b, 0.1)
      .setDepth(DEPTH.weather);

    this.laneGlow = this.add
      .image(laneX(1), PLAYER_Y - 220, "fx-lane-glow")
      .setDepth(DEPTH.roadMarking)
      .setAlpha(0);

    this.createPlayer();
    this.setupInput();
    this.autopilot =
      typeof location !== "undefined" &&
      new URLSearchParams(location.search).has("autopilot");

    // seed some scenery so the first frame isn't empty
    for (let i = 0; i < 6; i++) {
      this.spawnRoadsideProp(Phaser.Math.Between(0, GAME_HEIGHT));
    }

    gameAudio.startEngine();
    this.scene.launch("hud", this.cfg);
    this.time.delayedCall(150, () => gameAudio.play("go"));

    // pause when the tab loses focus
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    });
  }

  private onBlur = (): void => {
    if (this.state === "running") this.events.emit("hud:requestPause");
  };

  /* ------------------------------- player ------------------------------ */

  private createPlayer(): void {
    const tex = VEHICLE_TEXTURE[this.vehicle.id];
    this.playerShadow = this.add
      .image(0, 10, "fx-shadow")
      .setDepth(DEPTH.shadow)
      .setScale(this.vehicle.id === "bike" ? 0.6 : 1);
    this.playerSprite = this.add.image(0, 0, tex);
    this.shieldSprite = this.add.image(0, 0, "fx-shield").setVisible(this.shielded);
    this.player = this.add
      .container(laneX(1), PLAYER_Y, [this.playerSprite, this.shieldSprite])
      .setDepth(DEPTH.player);
    this.playerShadow.setPosition(laneX(1), PLAYER_Y + 12);

    const frame = this.textures.getFrame(tex);
    this.playerHalfW = (frame.width / 2) * this.vehicle.hitboxScale;
    this.playerHalfH = (frame.height / 2) * 0.88;

    if (this.shielded) this.shieldSprite.setScale(1.06);
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      kb.on("keydown-LEFT", () => this.steer(-1));
      kb.on("keydown-RIGHT", () => this.steer(1));
      kb.on("keydown-A", () => this.steer(-1));
      kb.on("keydown-D", () => this.steer(1));
      kb.on("keydown-SPACE", () => this.activatePower());
      // ESC/P pause handling lives in the HUD scene (single owner)
    }

    // top HUD bar and power-button corner are UI territory, not steering
    const inUiZone = (x: number, y: number): boolean =>
      y < 92 || (x > GAME_WIDTH - 140 && y > GAME_HEIGHT - 140);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (inUiZone(p.x, p.y)) {
        this.swipeActive = false;
        return;
      }
      this.swipeStartX = p.x;
      this.swipeStartY = p.y;
      this.swipeActive = true;
      this.swipeConsumedAt = p.x;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.swipeActive) return;
      const dx = p.x - this.swipeConsumedAt;
      const dyTotal = Math.abs(p.y - this.swipeStartY);
      if (Math.abs(dx) > 30 && Math.abs(dx) > dyTotal * 0.8) {
        this.steer(Math.sign(dx));
        this.swipeConsumedAt = p.x;
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.swipeActive) return;
      this.swipeActive = false;
      const dx = p.x - this.swipeStartX;
      const dy = p.y - this.swipeStartY;
      const dur = p.upTime - p.downTime;
      // quick tap = tap-zone steering (left/right thirds)
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14 && dur < 260) {
        if (p.x < GAME_WIDTH * 0.42) this.steer(-1);
        else if (p.x > GAME_WIDTH * 0.58) this.steer(1);
      }
    });
  }

  private steer(dir: number): void {
    if (this.state !== "running" && this.state !== "intro") return;
    const next = Phaser.Math.Clamp(this.targetLane + dir, 0, LANE_COUNT - 1);
    if (next === this.targetLane) return;
    this.targetLane = next;
    this.events.emit("hud:firstInput");
    gameAudio.play("laneChange");

    const fromX = this.player.x;
    const toX = laneX(next);
    const dist = Math.abs(toX - fromX);
    const dur = this.vehicle.laneChangeMs * (dist / LANE_WIDTH) * (this.wifiTimer > 0 ? 0.9 : 1);

    this.laneTween?.stop();
    this.laneTween = this.tweens.add({
      targets: this.player,
      x: toX,
      duration: Math.max(60, dur),
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.lane = next;
      },
    });
    // lane-change tilt (restrained, and skipped for reduced motion)
    if (!this.settings.reducedMotion) {
      this.tweens.add({
        targets: this.playerSprite,
        angle: 9 * dir,
        duration: 90,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: () => this.playerSprite.setAngle(0),
      });
    }
  }

  private activatePower(): void {
    if (this.state !== "running" || !this.storedPower) return;
    const kind = this.storedPower;
    this.storedPower = null;
    this.events.emit("hud:power", { stored: null, active: kind });
    switch (kind) {
      case "coffee":
        this.coffeeTimer = 4;
        gameAudio.play("coffee");
        this.popup("COFFEE BOOST!", palette.amber);
        break;
      case "cloudShield":
        this.shielded = true;
        this.shieldSprite.setVisible(true).setAlpha(0).setScale(0.5);
        this.tweens.add({ targets: this.shieldSprite, alpha: 1, scale: 1.06, duration: 220 });
        gameAudio.play("shieldUp");
        this.popup("CLOUD SHIELD", palette.blue);
        this.events.emit("hud:integrity", { integrity: this.integrity, shielded: true });
        break;
      case "stableWifi":
        this.wifiTimer = 4;
        gameAudio.play("wifi");
        this.popup("STABLE WI-FI", palette.green);
        break;
      case "geminiAssist":
        this.geminiTimer = 6;
        gameAudio.play("gemini");
        this.popup("ROUTE ASSIST", palette.blue);
        break;
    }
  }

  /* ------------------------------ spawning ----------------------------- */

  private execute(cmd: SpawnCommand): void {
    switch (cmd.type) {
      case "static":
        this.spawnStatic(cmd.kind, cmd.lane);
        break;
      case "truck":
        this.spawnTruck(cmd.lane);
        break;
      case "danfo":
        this.spawnDanfo(cmd.lane, cmd.toLane);
        break;
      case "okada":
        this.spawnOkada(cmd.laneA, cmd.laneB);
        break;
      case "bug":
        this.spawnBug(cmd.fromLeft);
        break;
      case "merge":
        this.spawnMerge(cmd.stayLane, cmd.mergeLane);
        break;
      case "deploy":
        this.spawnDeploy(cmd.leftLane);
        break;
      case "collectLine":
        this.spawnCollectLine(cmd.lane, cmd.kind, cmd.count);
        break;
      case "badge":
        this.spawnPickup("badge", cmd.lane, SPAWN_Y);
        break;
      case "powerup":
        this.spawnPickup("powerup", cmd.lane, SPAWN_Y, cmd.kind);
        break;
    }
  }

  private makeObstacle(
    kind: ObstacleKind,
    lane: number,
    parts: Phaser.GameObjects.GameObject[],
    halfW: number,
    halfH: number,
    opts: Partial<Obstacle> = {},
  ): Obstacle {
    const node = this.add.container(laneX(lane), SPAWN_Y, parts).setDepth(DEPTH.obstacle);
    const o: Obstacle = {
      kind,
      node,
      lane,
      halfW,
      halfH,
      ownSpeedFrac: 0,
      passed: false,
      hit: false,
      minGap: Infinity,
      special: false,
      slowMover: false,
      ...opts,
    };
    this.obstacles.push(o);
    return o;
  }

  private img(key: string): Phaser.GameObjects.Image {
    return this.add.image(0, 0, key);
  }

  private spawnStatic(kind: string, lane: number): void {
    switch (kind) {
      case "pothole": {
        const o = this.makeObstacle("pothole", lane, [this.img("obs-pothole")], 24, 15);
        o.node.setDepth(DEPTH.roadMarking + 0.5);
        break;
      }
      case "constructionBarrier":
        this.makeObstacle("constructionBarrier", lane, [this.img("obs-barrier")], 40, 30);
        break;
      case "brokenDownCar": {
        const smoke = this.add.particles(0, -46, "fx-smoke", {
          speedY: { min: -30, max: -60 },
          speedX: { min: -8, max: 8 },
          scale: { start: 0.5, end: 1.4 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 900,
          frequency: this.settings.reducedMotion ? 500 : 220,
        });
        this.makeObstacle("brokenDownCar", lane, [this.img("obs-broken"), smoke], 30, 56);
        break;
      }
      case "loadingSpinner": {
        const disc = this.img("obs-spinner");
        const o = this.makeObstacle("loadingSpinner", lane, [disc], 36, 36);
        o.onUpdate = (obs, dt) => {
          disc.angle += dt * 220;
          void obs;
        };
        break;
      }
      case "expiredApiKey":
        this.makeObstacle("expiredApiKey", lane, [
          this.img("obs-apigate"),
          this.add
            .text(0, -32, "401 · KEY EXPIRED", {
              fontFamily: MONO,
              fontSize: "10px",
              color: palette.ink,
              backgroundColor: "#ffffff",
              padding: { x: 4, y: 2 },
            })
            .setOrigin(0.5),
        ], 46, 30);
        break;
      case "figmaLayers": {
        const tag = this.add
          .text(0, 34, "Layer 47 copy copy", {
            fontFamily: MONO,
            fontSize: "9px",
            color: palette.ink,
            backgroundColor: "#ffffff",
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5);
        const o = this.makeObstacle("figmaLayers", lane, [this.img("obs-figma"), tag], 40, 34);
        // unnamed layers drift, of course they do
        o.data = { t: Math.random() * Math.PI * 2 };
        o.onUpdate = (obs, dt) => {
          obs.data!.t = (obs.data!.t as number) + dt * 2;
          obs.node.x = laneX(obs.lane) + Math.sin(obs.data!.t as number) * 8;
        };
        break;
      }
    }
  }

  private spawnTruck(lane: number): void {
    const o = this.makeObstacle("slowTruck", lane, [this.shadowFor(84, 150), this.img("obs-truck")], 38, 70);
    o.ownSpeedFrac = 0.2;
    o.slowMover = true;
  }

  private spawnDanfo(lane: number, toLane: number | null): void {
    const body = this.img("obs-danfo");
    const indicator = this.add.circle(30, 40, 5, 0xf9ab00).setVisible(false);
    const o = this.makeObstacle(
      "danfoLaneChanger",
      lane,
      [this.shadowFor(76, 124), body, indicator],
      34,
      58,
    );
    o.ownSpeedFrac = 0.12;
    o.slowMover = true;
    if (toLane !== null) {
      o.data = { toLane, phase: 0 };
      o.onUpdate = (obs) => {
        const y = obs.node.y;
        if (obs.data!.phase === 0 && y > 40) {
          obs.data!.phase = 1;
          const dir = (obs.data!.toLane as number) > obs.lane ? 1 : -1;
          indicator.setPosition(30 * dir, 40).setVisible(true);
          this.tweens.add({ targets: indicator, alpha: 0.15, duration: 160, yoyo: true, repeat: 6 });
        } else if (obs.data!.phase === 1 && y > 170) {
          obs.data!.phase = 2;
          indicator.setVisible(false);
          const target = obs.data!.toLane as number;
          const dir = target > obs.lane ? 1 : -1;
          obs.lane = target;
          if (!this.settings.reducedMotion) {
            this.tweens.add({ targets: body, angle: 10 * dir, duration: 240, yoyo: true });
          }
          this.tweens.add({
            targets: obs.node,
            x: laneX(target),
            duration: 620,
            ease: "Sine.easeInOut",
          });
        }
      };
    }
  }

  private spawnOkada(laneA: number, laneB: number): void {
    const o = this.makeObstacle(
      "okada",
      laneA,
      [this.shadowFor(42, 80), this.img("obs-okada")],
      18,
      40,
    );
    o.ownSpeedFrac = 0.3;
    o.slowMover = true;
    o.special = true;
    const xA = laneX(laneA);
    const xB = laneX(laneB);
    o.data = { t: 0 };
    o.onUpdate = (obs, dt) => {
      obs.data!.t = (obs.data!.t as number) + dt * 3.6;
      const t = obs.data!.t as number;
      const k = (Math.sin(t) + 1) / 2;
      obs.node.x = xA + (xB - xA) * k;
      obs.lane = k < 0.5 ? laneA : laneB;
      (obs.node.list[1] as Phaser.GameObjects.Image).angle = Math.cos(t) * 14 * Math.sign(xB - xA);
    };
  }

  private spawnBug(fromLeft: boolean): void {
    const bug = this.img("obs-bug");
    bug.setFlipX(!fromLeft);
    const warn = this.add.image(0, -58, "fx-warn").setScale(0.9);
    this.tweens.add({ targets: warn, alpha: 0.25, duration: 200, yoyo: true, repeat: 8, onComplete: () => warn.setVisible(false) });
    const o = this.makeObstacle("productionBug", 0, [this.shadowFor(80, 56), bug, warn], 36, 26);
    o.special = true;
    const startX = fromLeft ? ROAD_LEFT - 70 : ROAD_LEFT + ROAD_WIDTH + 70;
    o.node.x = startX;
    o.data = { vx: (fromLeft ? 1 : -1) * 130, wob: 0, entered: 0 };
    o.onUpdate = (obs, dt) => {
      obs.data!.wob = (obs.data!.wob as number) + dt * 14;
      // waits a beat at the roadside, then scuttles across
      if ((obs.data!.entered as number) < 0.7) {
        obs.data!.entered = (obs.data!.entered as number) + dt;
        return;
      }
      obs.node.x += (obs.data!.vx as number) * dt;
      (obs.node.list[1] as Phaser.GameObjects.Image).y = Math.sin(obs.data!.wob as number) * 3;
    };
  }

  private spawnMerge(stayLane: number, mergeLane: number): void {
    const stay = this.makeObstacle(
      "mergeConflict",
      stayLane,
      [this.shadowFor(76, 124), this.img("obs-danfo")],
      34,
      58,
    );
    stay.ownSpeedFrac = 0.12;
    stay.slowMover = true;
    stay.special = true;

    const moverBody = this.img("obs-truck");
    moverBody.setScale(0.9);
    const merging = this.makeObstacle(
      "mergeConflict",
      mergeLane,
      [this.shadowFor(84, 150), moverBody],
      34,
      62,
    );
    merging.ownSpeedFrac = 0.12;
    merging.slowMover = true;
    merging.special = true;
    merging.node.y = SPAWN_Y - 130;
    merging.data = { merged: 0 };
    merging.onUpdate = (obs) => {
      if (!obs.data!.merged && obs.node.y > 60) {
        obs.data!.merged = 1;
        obs.lane = stayLane;
        this.tweens.add({
          targets: obs.node,
          x: laneX(stayLane),
          duration: 700,
          ease: "Sine.easeInOut",
        });
        // the one who stays honks a wobble
        if (!this.settings.reducedMotion) {
          this.tweens.add({ targets: stay.node, x: laneX(stayLane) + 6, duration: 90, yoyo: true, repeat: 2 });
        }
      }
    };
  }

  private spawnDeploy(leftLane: number): void {
    const zone = this.img("obs-deploy");
    const lampL = this.add.circle(-LANE_WIDTH + 16, 0, 6, 0xea4335);
    const lampR = this.add.circle(LANE_WIDTH - 16, 0, 6, 0xea4335);
    this.tweens.add({ targets: [lampL, lampR], alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
    const label = this.add
      .text(0, 0, "FRIDAY DEPLOY", {
        fontFamily: MONO,
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: palette.red,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);
    const o = this.makeObstacle(
      "fridayDeploy",
      leftLane,
      [zone, lampL, lampR, label],
      Math.round(LANE_WIDTH) - 12,
      50,
    );
    o.special = true;
    // centre of the two lanes it spans
    o.node.x = (laneX(leftLane) + laneX(leftLane + 1)) / 2;
  }

  private shadowFor(w: number, h: number): Phaser.GameObjects.Image {
    const s = this.add.image(0, h * 0.08, "fx-shadow");
    s.setScale(w / 76, h / 110);
    return s;
  }

  /* ------------------------------ pickups ------------------------------ */

  private pickupTexture(kind: Pickup["kind"], power?: PowerUpKind): string {
    if (kind === "powerup") {
      return {
        coffee: "pow-coffee",
        cloudShield: "pow-shield",
        stableWifi: "pow-wifi",
        geminiAssist: "pow-gemini",
      }[power!];
    }
    return { star: "pick-star", codeToken: "pick-code", wifi: "pick-wifi", badge: "pick-badge" }[kind];
  }

  private obtainImage(key: string): Phaser.GameObjects.Image {
    const pool = this.pickupPool.get(key);
    const sprite = pool?.pop();
    if (sprite) {
      sprite.setActive(true).setVisible(true).setAlpha(1).setScale(1);
      return sprite;
    }
    return this.add.image(0, 0, key);
  }

  private releaseImage(img: Phaser.GameObjects.Image): void {
    img.setActive(false).setVisible(false);
    const key = img.texture.key;
    if (!this.pickupPool.has(key)) this.pickupPool.set(key, []);
    this.pickupPool.get(key)!.push(img);
  }

  private spawnPickup(
    kind: Pickup["kind"],
    lane: number,
    y: number,
    power?: PowerUpKind,
  ): void {
    const sprite = this.obtainImage(this.pickupTexture(kind, power));
    sprite.setPosition(laneX(lane), y).setDepth(DEPTH.pickup);
    const glow = this.obtainImage("fx-glow");
    glow.setPosition(laneX(lane), y).setDepth(DEPTH.pickup - 0.1);
    glow.setScale(kind === "powerup" ? 1.35 : 1);
    this.pickups.push({
      kind,
      power,
      sprite,
      glow,
      halfW: kind === "powerup" ? 24 : 17,
      halfH: kind === "powerup" ? 24 : 18,
      collected: false,
    });
  }

  private spawnCollectLine(lane: number, kind: Exclude<CollectibleKind, "badge">, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnPickup(kind, lane, SPAWN_Y - i * 72);
    }
  }

  /* ----------------------------- roadside ------------------------------ */

  private spawnRoadsideProp(atY = SPAWN_Y): void {
    const beat = beatForProgress(this.progress());
    const left = Math.random() < 0.5;
    const x = left ? Phaser.Math.Between(2, 34) : GAME_WIDTH - Phaser.Math.Between(2, 34);

    let node: RoadsideProp["node"] | null = null;
    const rndPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    if (beat === "flyover") {
      const key = rndPick(["prop-skyline", "fx-cloud", "prop-light"]);
      node = this.add.image(key === "prop-skyline" ? (left ? -12 : GAME_WIDTH + 12) : x, atY, key);
      if (key === "fx-cloud") node.setAlpha(0.9);
    } else if (beat === "approach") {
      const kind = rndPick(["crowd", "flag", "billboard", "palm", "light"]);
      if (kind === "crowd") node = this.add.image(left ? 8 : GAME_WIDTH - 8, atY, "prop-crowd");
      else if (kind === "flag") node = this.add.image(x, atY, "prop-flag");
      else if (kind === "palm") node = this.add.image(x, atY, "prop-palm");
      else if (kind === "light") node = this.add.image(x, atY, "prop-light").setFlipX(!left);
      else node = this.makeBillboard(left, atY, true);
    } else {
      const pool =
        beat === "morning"
          ? ["palm", "tree", "busstop", "bldg", "light", "vendor"]
          : ["bldg", "bldg", "vendor", "busstop", "billboard", "light", "palm", "tree"];
      const kind = rndPick(pool);
      if (kind === "palm") node = this.add.image(x, atY, "prop-palm");
      else if (kind === "tree") node = this.add.image(x, atY, "prop-tree");
      else if (kind === "vendor") node = this.add.image(x, atY, "prop-vendor");
      else if (kind === "busstop") node = this.add.image(left ? 12 : GAME_WIDTH - 12, atY, "prop-busstop");
      else if (kind === "light") node = this.add.image(left ? 16 : GAME_WIDTH - 16, atY, "prop-light").setFlipX(!left);
      else if (kind === "bldg")
        node = this.add.image(left ? 6 : GAME_WIDTH - 6, atY, rndPick(["prop-bldg-a", "prop-bldg-b", "prop-bldg-c"]));
      else node = this.makeBillboard(left, atY, false);
    }

    if (!node) return;
    node.setDepth(DEPTH.roadside);
    this.roadside.push({ node, drift: 0 });
  }

  private billboardMessages = [
    "DEVFEST\nLAGOS 2026",
    "DEVFEST →\n2KM AHEAD",
    "TRY · CATCH\n· DODGE",
    "#DEVFEST\nLAGOS",
    "FREE WI-FI\n(REAL ONE)",
    "SHIP IT\n(ON MONDAY)",
    "KEYNOTE\nLOADING…",
  ];

  private makeBillboard(left: boolean, atY: number, devfest: boolean): Phaser.GameObjects.Container {
    const board = this.add.image(0, 0, "prop-billboard");
    const msg = devfest
      ? this.billboardMessages[Math.floor(Math.random() * 2)]
      : this.billboardMessages[Math.floor(Math.random() * this.billboardMessages.length)];
    const text = this.add
      .text(-2, -13, msg, {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: "13px",
        fontStyle: "bold",
        color: palette.ink,
        align: "center",
      })
      .setOrigin(0.5);
    return this.add.container(left ? 30 : GAME_WIDTH - 30, atY, [board, text]);
  }

  /* ------------------------------- update ------------------------------ */

  private progress(): number {
    return Math.min(1, this.stats.distance / RUN.goalDistance);
  }

  update(_time: number, deltaMs: number): void {
    if (this.state === "done") return;
    const dt = Math.min(deltaMs / 1000, 0.05);

    if (this.state === "intro") {
      this.elapsed += dt;
      if (this.elapsed >= 1.1) {
        this.state = "running";
        this.elapsed = 0;
      }
      this.scrollWorld(dt, this.director.speedFor(0) * 0.7);
      return;
    }

    if (this.state === "arriving" || this.state === "ending") {
      this.scrollWorld(dt, this.arrivalSpeed);
      this.updateObstacles(dt, this.arrivalSpeed);
      this.updatePickups(dt, this.arrivalSpeed);
      return;
    }

    /* -------- running -------- */
    this.elapsed += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitSlow = Math.max(0, this.hitSlow - dt);
    this.coffeeTimer = Math.max(0, this.coffeeTimer - dt);
    this.wifiTimer = Math.max(0, this.wifiTimer - dt);
    this.geminiTimer = Math.max(0, this.geminiTimer - dt);

    // effective road speed
    let speed = this.director.speedFor(this.elapsed) * this.vehicle.speedFactor;
    if (this.coffeeTimer > 0) speed *= 1.28;
    if (this.wifiTimer > 0) speed *= 0.72;
    if (this.hitSlow > 0) {
      const k = 1 - this.hitSlow / RUN.hitSlowRecovery;
      speed *= RUN.hitSlowFactor + (1 - RUN.hitSlowFactor) * k;
    }

    gameAudio.setEngineSpeed(Phaser.Math.Clamp(speed / RUN.maxSpeed, 0, 1));

    this.scrollWorld(dt, speed);
    this.scrolledPx += speed * dt;
    this.stats.distance = Math.floor(this.scrolledPx / RUN.pxPerMetre);

    // keynote clock
    this.keynoteRemaining -= dt;
    if (this.keynoteRemaining <= 10.5 && this.keynoteRemaining > 0) {
      const whole = Math.ceil(this.keynoteRemaining);
      if (whole !== this.lastCountdownBeep) {
        this.lastCountdownBeep = whole;
        gameAudio.play("countdownBeep");
      }
    }
    this.events.emit("hud:tick", {
      remaining: Math.max(0, this.keynoteRemaining),
      progress: this.progress(),
      score: this.liveScore,
    });

    if (this.keynoteRemaining <= 0) {
      this.finishRun("timeout");
      return;
    }

    // route beats
    const beat = beatForProgress(this.progress());
    if (beat !== this.lastBeat) this.enterBeat(beat);

    // director spawns
    const slowLanes = new Set<number>();
    let specialAlive = false;
    for (const o of this.obstacles) {
      if (o.slowMover && o.node.y < PLAYER_Y) {
        slowLanes.add(o.lane);
        if (o.data && typeof o.data.toLane === "number") slowLanes.add(o.data.toLane);
      }
      if (o.special) specialAlive = true;
    }
    for (const cmd of this.director.update(this.scrolledPx, this.elapsed, this.progress(), {
      slowMoverLanes: slowLanes,
      specialAlive,
    })) {
      this.execute(cmd);
    }

    // gemini lane glow
    if (this.geminiTimer > 0) {
      this.laneGlow.setAlpha(Math.min(0.9, this.geminiTimer));
      const gx = laneX(this.director.safeLane);
      this.laneGlow.x += (gx - this.laneGlow.x) * Math.min(1, dt * 6);
    } else {
      this.laneGlow.setAlpha(Math.max(0, this.laneGlow.alpha - dt * 2));
    }

    if (this.autopilot) {
      this.autopilotTimer -= dt;
      if (this.autopilotTimer <= 0) {
        this.autopilotTimer = 0.15;
        this.runAutopilot();
      }
    }

    this.updateObstacles(dt, speed);
    this.updatePickups(dt, speed);
    this.checkCollisions();

    // player invulnerability blink
    this.playerSprite.setAlpha(this.invuln > 0 ? (Math.sin(this.elapsed * 30) > 0 ? 0.4 : 1) : 1);
    this.playerShadow.x = this.player.x;

    // arrival?
    if (this.stats.distance >= RUN.goalDistance) {
      this.beginArrival();
      return;
    }

    // live score readout (cheap, 5x/s)
    this.liveScoreTimer += dt;
    if (this.liveScoreTimer > 0.2) {
      this.liveScoreTimer = 0;
      this.liveScore = computeScore({
        ...this.stats,
        result: "wrecked",
        remainingTime: 0,
        dodges: this.dodges,
      }).total;
    }
  }

  private scrollWorld(dt: number, speed: number): void {
    this.roadA.tilePositionY -= speed * dt;
    this.roadB.tilePositionY -= speed * dt;

    // roadside props move with the road
    this.nextRoadsideAt -= speed * dt;
    if (this.nextRoadsideAt <= 0) {
      this.spawnRoadsideProp();
      this.nextRoadsideAt = Phaser.Math.Between(90, 200);
    }
    for (let i = this.roadside.length - 1; i >= 0; i--) {
      const p = this.roadside[i];
      p.node.y += speed * dt;
      const s = depthScale(p.node.y);
      p.node.setScale(s);
      if (p.node.y > DESPAWN_Y + 80) {
        p.node.destroy();
        this.roadside.splice(i, 1);
      }
    }
  }

  private updateObstacles(dt: number, speed: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const approach = speed * (1 - o.ownSpeedFrac * (this.wifiTimer > 0 ? 0.5 : 1));
      o.node.y += approach * dt;
      o.node.setScale(depthScale(o.node.y));
      o.onUpdate?.(o, dt, speed);

      // near-miss bookkeeping while the obstacle is close
      const dy = o.node.y - PLAYER_Y;
      if (dy > -320 && dy < 40 && !o.hit) {
        const gap = Math.max(
          0,
          Math.abs(o.node.x - this.player.x) - (o.halfW + this.playerHalfW),
        );
        o.minGap = Math.min(o.minGap, gap);
      }

      if (!o.passed && dy > 80) {
        o.passed = true;
        if (!o.hit && this.state === "running") {
          this.onObstacleCleared(o);
        }
      }

      if (o.node.y > DESPAWN_Y) {
        o.node.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  private onObstacleCleared(o: Obstacle): void {
    this.dodges++;
    this.stats.dodges = this.dodges;
    this.comboEvent();
    if (o.minGap < 26) {
      this.stats.nearMisses++;
      this.comboEvent();
      const pts = Math.round(SCORING.nearMissBase * this.vehicle.nearMissBonus);
      gameAudio.play("nearMiss");
      const label =
        o.kind === "productionBug"
          ? `+${pts} BUG DODGED`
          : o.kind === "fridayDeploy"
            ? `+${pts} SAFE ROLLBACK`
            : `+${pts} NEAR MISS`;
      this.popup(label, palette.amber);
    }
  }

  private comboEvent(): void {
    const inc = this.coffeeTimer > 0 ? 2 : 1;
    this.comboCount += inc;
    this.stats.highestCombo = Math.max(this.stats.highestCombo, this.comboCount);
    const mult = comboMultiplier(this.comboCount);
    this.stats.comboScore += SCORING.comboStep * mult;
    this.events.emit("hud:combo", { count: this.comboCount, mult });
    if (mult > 1 && this.comboCount % SCORING.comboEventsPerLevel === 0) {
      this.popup(`x${mult} COMBO`, palette.green);
    }
  }

  private updatePickups(dt: number, speed: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.sprite.y += speed * dt;
      p.glow.y = p.sprite.y;
      p.glow.x = p.sprite.x;
      const s = depthScale(p.sprite.y);
      p.sprite.setScale(s);
      // gentle bob
      p.sprite.angle = Math.sin(p.sprite.y / 30) * 6;

      if (p.sprite.y > DESPAWN_Y) {
        this.releaseImage(p.sprite);
        this.releaseImage(p.glow);
        this.pickups.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    if (this.state !== "running") return;
    const px = this.player.x;
    const py = PLAYER_Y;

    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.collected) continue;
      if (
        Math.abs(p.sprite.x - px) < p.halfW + this.playerHalfW * 0.8 &&
        Math.abs(p.sprite.y - py) < p.halfH + this.playerHalfH * 0.8
      ) {
        p.collected = true;
        this.collect(p);
        this.releaseImage(p.sprite);
        this.releaseImage(p.glow);
        this.pickups.splice(i, 1);
      }
    }

    if (this.invuln > 0) return;

    for (const o of this.obstacles) {
      if (o.hit || o.passed) continue;
      if (
        Math.abs(o.node.x - px) < o.halfW + this.playerHalfW &&
        Math.abs(o.node.y - py) < o.halfH + this.playerHalfH
      ) {
        this.onCollision(o);
        break;
      }
    }
  }

  private collect(p: Pickup): void {
    const burst = (color: number) => {
      if (this.settings.reducedMotion) return;
      const em = this.add.particles(p.sprite.x, p.sprite.y, "fx-spark", {
        speed: { min: 60, max: 160 },
        scale: { start: 0.9, end: 0 },
        lifespan: 350,
        quantity: 8,
        tint: color,
      });
      em.explode(8);
      this.time.delayedCall(400, () => em.destroy());
    };

    if (p.kind === "powerup") {
      this.storedPower = p.power!;
      gameAudio.play("powerStore");
      this.events.emit("hud:power", { stored: p.power, active: null });
      this.popup("POWER-UP READY", palette.blue);
      burst(0x4285f4);
      return;
    }
    if (p.kind === "badge") {
      this.stats.collectibles.badge++;
      this.keynoteRemaining += RUN.badgeTimeBonus;
      gameAudio.play("badge");
      this.popup(`+${RUN.badgeTimeBonus} SECONDS`, palette.green);
      burst(0x34a853);
      return;
    }
    this.stats.collectibles[p.kind]++;
    gameAudio.play("pickup");
    const v = SCORING.collectibleValues[p.kind];
    this.popup(`+${v}`, palette.ink);
    burst(p.kind === "star" ? 0xf9ab00 : p.kind === "wifi" ? 0x4285f4 : 0x1e1e1e);
  }

  private onCollision(o: Obstacle): void {
    o.hit = true;
    if (this.shielded) {
      this.shielded = false;
      this.invuln = 1.0;
      gameAudio.play("shieldPop");
      this.tweens.add({
        targets: this.shieldSprite,
        alpha: 0,
        scale: 1.5,
        duration: 260,
        onComplete: () => this.shieldSprite.setVisible(false).setScale(1.06),
      });
      this.popup("SHIELD SAVED YOU", palette.blue);
      this.events.emit("hud:integrity", { integrity: this.integrity, shielded: false });
      return;
    }

    this.integrity--;
    this.stats.collisions++;
    this.comboCount = 0;
    this.invuln = RUN.hitInvulnSeconds;
    this.hitSlow = RUN.hitSlowRecovery;
    gameAudio.play("collision");
    this.events.emit("hud:combo", { count: 0, mult: 1 });
    this.events.emit("hud:integrity", { integrity: this.integrity, shielded: false });
    this.events.emit("hud:damageFlash");

    if (!this.settings.reducedMotion) {
      this.cameras.main.shake(90, 0.004);
    }
    const em = this.add.particles(this.player.x, PLAYER_Y, "fx-smoke", {
      speed: { min: 40, max: 120 },
      scale: { start: 0.8, end: 0 },
      lifespan: 420,
      quantity: 10,
    });
    em.explode(10);
    this.time.delayedCall(500, () => em.destroy());

    const quips = ["OUCH. LAGOS 1 — YOU 0", "MIND THE DANFO", "THAT LEFT A MARK", "REROUTING PRIDE…"];
    this.popup(quips[Math.floor(Math.random() * quips.length)], palette.red);

    if (this.integrity <= 0) {
      this.finishRun("wrecked");
    }
  }

  /* --------------------------- beats & endings ------------------------- */

  private enterBeat(beat: RouteBeat): void {
    this.lastBeat = beat;
    const toasts: Record<RouteBeat, string> = {
      morning: "MORNING COMMUTE",
      mainland: "MAINLAND TRAFFIC — STAY SHARP",
      flyover: "FLYOVER — NICE VIEW, NO PARKING",
      rain: "SUDDEN RAIN — ROADS ARE SLICK",
      approach: "DEVFEST AHEAD — ALMOST THERE",
    };
    this.events.emit("hud:toast", toasts[beat]);

    const fadeRoad = (key: string) => {
      if (this.currentRoadKey === key) return;
      this.roadB.setTexture(key);
      this.roadB.tilePositionY = this.roadA.tilePositionY;
      this.currentRoadKey = key;
      this.tweens.add({
        targets: this.roadB,
        alpha: 1,
        duration: 900,
        onComplete: () => {
          this.roadA.setTexture(key);
          this.roadB.setAlpha(0);
        },
      });
    };

    switch (beat) {
      case "mainland":
        fadeRoad("road-day");
        this.tweens.add({ targets: this.ambient, fillAlpha: 0, duration: 1200 });
        break;
      case "flyover":
        fadeRoad("road-flyover");
        break;
      case "rain": {
        fadeRoad("road-wet");
        this.ambient.setFillStyle(0x1e2a3a, 0);
        this.tweens.add({ targets: this.ambient, fillAlpha: 0.22, duration: 1200 });
        gameAudio.setRain(true);
        const density = this.settings.reducedMotion ? 60 : 22;
        this.rainEmitter = this.add.particles(0, -20, "fx-raindrop", {
          x: { min: 0, max: GAME_WIDTH },
          speedY: { min: 750, max: 950 },
          speedX: { min: -60, max: -30 },
          lifespan: 1100,
          frequency: density,
          quantity: 1,
          alpha: { start: 0.9, end: 0.4 },
        });
        this.rainEmitter.setDepth(DEPTH.weather + 1);
        break;
      }
      case "approach":
        fadeRoad("road-day");
        this.tweens.add({ targets: this.ambient, fillAlpha: 0, duration: 1500 });
        gameAudio.setRain(false);
        if (this.rainEmitter) {
          this.rainEmitter.stop();
          const em = this.rainEmitter;
          this.time.delayedCall(1300, () => em.destroy());
          this.rainEmitter = null;
        }
        break;
    }
  }

  private arrivalSpeed = 0;
  private gateNode: Phaser.GameObjects.Container | null = null;

  private beginArrival(): void {
    this.state = "arriving";
    this.arrivalSpeed = this.director.speedFor(this.elapsed) * this.vehicle.speedFactor * 0.9;
    this.stats.remainingTime = Math.max(0, this.keynoteRemaining);
    this.events.emit("hud:arrival");
    gameAudio.play("finish");

    // steer to centre lane for the hero moment
    this.laneTween?.stop();
    this.tweens.add({ targets: this.player, x: laneX(1), duration: 500, ease: "Sine.easeInOut" });
    this.playerShadow.x = this.player.x;

    // the gate scrolls in
    const gate = this.add.image(0, 0, "prop-gate");
    const label = this.add
      .text(0, -24, "DEVFEST LAGOS 2026", {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: "20px",
        fontStyle: "bold",
        color: palette.ink,
      })
      .setOrigin(0.5);
    const balloonsL = this.add.image(-ROAD_WIDTH / 2 - 8, 26, "fx-balloons");
    const balloonsR = this.add.image(ROAD_WIDTH / 2 + 8, 26, "fx-balloons").setFlipX(true);
    this.gateNode = this.add
      .container(GAME_WIDTH / 2, SPAWN_Y - 60, [gate, label, balloonsL, balloonsR])
      .setDepth(DEPTH.overhead);

    // crowd lines the road
    for (let i = 0; i < 4; i++) {
      const y = SPAWN_Y + 60 + i * 120;
      const l = this.add.image(8, y, "prop-crowd").setDepth(DEPTH.roadside);
      const r = this.add.image(GAME_WIDTH - 8, y, "prop-crowd").setDepth(DEPTH.roadside);
      this.roadside.push({ node: l, drift: 0 }, { node: r, drift: 0 });
    }

    // ease speed down and finish when the gate crosses the player
    this.tweens.add({
      targets: this,
      arrivalSpeed: 180,
      duration: 1600,
      ease: "Sine.easeOut",
    });

    const check = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.gateNode) return;
        this.gateNode.y += this.arrivalSpeed * 0.05;
        if (this.gateNode.y > PLAYER_Y - 40 && this.state === "arriving") {
          this.state = "ending";
          check.destroy();
          this.celebrateAndFinish();
        }
      },
    });
  }

  private celebrateAndFinish(): void {
    if (!this.settings.reducedMotion) {
      const confetti = this.add.particles(GAME_WIDTH / 2, -10, "fx-confetti", {
        x: { min: 0, max: GAME_WIDTH },
        speedY: { min: 150, max: 320 },
        speedX: { min: -40, max: 40 },
        rotate: { min: 0, max: 360 },
        scale: { min: 0.5, max: 1 },
        lifespan: 2600,
        frequency: 24,
        tint: [0xea4335, 0x4285f4, 0x34a853, 0xf9ab00],
      });
      confetti.setDepth(DEPTH.weather + 2);
      this.time.delayedCall(2100, () => confetti.stop());
    }
    this.arrivalSpeed = 140;
    this.time.delayedCall(2200, () => this.finishRun("arrived"));
  }

  private finishRun(result: RunResult): void {
    if (this.state === "done") return;
    this.state = "done";
    this.stats.result = result;
    this.stats.endedAt = Date.now();
    if (result !== "arrived") {
      this.stats.remainingTime = result === "timeout" ? 0 : Math.max(0, this.keynoteRemaining);
    }
    this.stats.distance = Math.min(this.stats.distance, RUN.goalDistance);
    this.stats.dodges = this.dodges;

    gameAudio.stopEngine();
    gameAudio.setRain(false);

    if (result === "wrecked") {
      gameAudio.play("fail");
      if (!this.settings.reducedMotion) {
        this.tweens.add({ targets: this.playerSprite, angle: 540, duration: 900, ease: "Cubic.easeOut" });
      }
      const em = this.add.particles(this.player.x, PLAYER_Y, "fx-smoke", {
        speed: { min: 20, max: 90 },
        scale: { start: 1, end: 0 },
        lifespan: 800,
        frequency: 60,
      });
      this.time.delayedCall(1100, () => em.destroy());
    } else if (result === "timeout") {
      gameAudio.play("fail");
    }

    const breakdown = computeScore(this.stats);
    this.time.delayedCall(result === "arrived" ? 400 : 1300, () => {
      this.game.events.emit("run:finished", { stats: { ...this.stats }, breakdown });
    });
  }

  /* ------------------------------- popups ------------------------------ */

  private popup(text: string, color: string): void {
    let t = this.popupPool.find((p) => !p.visible);
    if (!t) {
      t = this.add
        .text(0, 0, "", {
          fontFamily: MONO,
          fontSize: "13px",
          fontStyle: "bold",
          color: palette.ink,
          backgroundColor: "#ffffff",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.weather + 3);
      this.popupPool.push(t);
    }
    t.setText(text);
    t.setColor(color === palette.ink ? palette.ink : "#ffffff");
    t.setBackgroundColor(color === palette.ink ? "#ffffff" : color);
    t.setPosition(
      Phaser.Math.Clamp(this.player.x, 90, GAME_WIDTH - 90),
      PLAYER_Y - 86,
    );
    t.setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: t,
      y: PLAYER_Y - 150,
      alpha: 0,
      duration: this.settings.reducedMotion ? 500 : 850,
      ease: "Cubic.easeOut",
      onComplete: () => t!.setVisible(false),
    });
  }

  /**
   * Dev-only fairness probe: weighs obstacle threat per lane in a lookahead
   * window and steers toward the calmest lane. If this survives full runs,
   * the spawner is leaving humans a fair path.
   */
  private runAutopilot(): void {
    const lookahead = 460;
    const threat = [0, 0, 0];
    for (const o of this.obstacles) {
      if (o.hit) continue;
      const dy = PLAYER_Y - o.node.y;
      if (dy < -30 || dy > lookahead) continue;
      const closeness = 1 - Math.max(0, dy) / lookahead;
      for (let l = 0; l < LANE_COUNT; l++) {
        const dx = Math.abs(o.node.x - laneX(l));
        if (dx < o.halfW + this.playerHalfW + 8) {
          threat[l] += 10 * closeness * closeness;
        }
      }
    }
    let best = this.targetLane;
    let bestCost = Infinity;
    for (let l = 0; l < LANE_COUNT; l++) {
      const cost =
        threat[l] +
        Math.abs(l - this.targetLane) * 0.4 +
        (l === this.director.safeLane ? 0 : 0.2);
      if (cost < bestCost) {
        bestCost = cost;
        best = l;
      }
    }
    if (best !== this.targetLane) {
      this.steer(Math.sign(best - this.targetLane));
    } else if (this.storedPower && threat[this.targetLane] === 0) {
      this.activatePower();
    }
  }

  /** exposed for the HUD scene */
  getHudSnapshot() {
    return {
      score: this.liveScore,
      remaining: Math.max(0, this.keynoteRemaining),
      progress: this.progress(),
      integrity: this.integrity,
      shielded: this.shielded,
      combo: this.comboCount,
      comboMult: comboMultiplier(this.comboCount),
      storedPower: this.storedPower,
      activeTimers: {
        coffee: this.coffeeTimer,
        wifi: this.wifiTimer,
        gemini: this.geminiTimer,
      },
      state: this.state,
    };
  }

  requestActivatePower(): void {
    this.activatePower();
  }
}
