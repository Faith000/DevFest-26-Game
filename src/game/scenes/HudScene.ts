import * as Phaser from "phaser";
import type { PowerUpKind } from "@/types/game";
import { palette } from "@/config/theme";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { RUN } from "../balancing/run";
import { gameAudio } from "../systems/audio";
import type { RunSceneConfig } from "../types";
import type { RunScene } from "./RunScene";

const GROTESK = '"Space Grotesk", sans-serif';
const MONO = '"Space Mono", monospace';

const POWER_TEXTURE: Record<PowerUpKind, string> = {
  coffee: "pow-coffee",
  cloudShield: "pow-shield",
  stableWifi: "pow-wifi",
  geminiAssist: "pow-gemini",
};

const POWER_LABEL: Record<PowerUpKind, string> = {
  coffee: "COFFEE BOOST",
  cloudShield: "CLOUD SHIELD",
  stableWifi: "STABLE WI-FI",
  geminiAssist: "ROUTE ASSIST",
};

/** draws a site-style panel: white fill, ink border, hard offset shadow */
function panel(
  scene: Phaser.Scene,
  w: number,
  h: number,
  fill = 0xffffff,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x1e1e1e, 1);
  g.fillRect(3, 3, w, h);
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(2, 0x1e1e1e, 1);
  g.strokeRect(0, 0, w, h);
  return g;
}

export class HudScene extends Phaser.Scene {
  private runScene!: RunScene;
  private cfg!: RunSceneConfig;
  private ui = 1;

  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerPanel!: Phaser.GameObjects.Graphics;
  private comboChip!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private lastComboMult = 1;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private carMarker!: Phaser.GameObjects.Rectangle;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  private shieldIcon!: Phaser.GameObjects.Arc;
  private powerBtn!: Phaser.GameObjects.Container;
  private powerIcon!: Phaser.GameObjects.Image;
  private powerHint!: Phaser.GameObjects.Text;
  private powerTimerArc!: Phaser.GameObjects.Graphics;
  private damageFlash!: Phaser.GameObjects.Rectangle;
  private toast!: Phaser.GameObjects.Text;
  private toastTween: Phaser.Tweens.Tween | null = null;
  private tutorial: Phaser.GameObjects.Container | null = null;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;
  private goText!: Phaser.GameObjects.Text;

  constructor() {
    super("hud");
  }

  init(cfg: RunSceneConfig): void {
    this.cfg = cfg;
    this.ui = cfg.settings.largeUi ? 1.18 : 1;
    this.paused = false;
    this.lastComboMult = 1;
    this.pips = [];
    this.toastTween = null;
    this.tutorial = null;
  }

  create(): void {
    this.runScene = this.scene.get("run") as RunScene;
    const ui = this.ui;
    const hc = this.cfg.settings.highContrast;

    /* score (top-left) */
    const scorePanel = this.add.container(10, 12, [panel(this, 118 * ui, 44 * ui)]);
    scorePanel.add(
      this.add.text(8 * ui, 5 * ui, "SCORE", {
        fontFamily: MONO,
        fontSize: `${9 * ui}px`,
        color: "#5f5f5f",
      }),
    );
    this.scoreText = this.add.text(8 * ui, 16 * ui, "0", {
      fontFamily: GROTESK,
      fontSize: `${20 * ui}px`,
      fontStyle: "bold",
      color: palette.ink,
    });
    scorePanel.add(this.scoreText);

    /* combo chip below score */
    this.comboText = this.add
      .text(0, 0, "x1", {
        fontFamily: GROTESK,
        fontSize: `${13 * ui}px`,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const comboBg = this.add.rectangle(0, 0, 44 * ui, 22 * ui, 0x34a853).setStrokeStyle(2, 0x1e1e1e);
    this.comboChip = this.add
      .container(10 + 32 * ui, 12 + 58 * ui, [comboBg, this.comboText])
      .setVisible(false);

    /* keynote timer (top-centre) */
    const tw = 150 * ui;
    this.timerPanel = panel(this, tw, 34 * ui, 0x1e1e1e);
    const timerWrap = this.add.container(GAME_WIDTH / 2 - tw / 2, 12, [this.timerPanel]);
    this.timerText = this.add
      .text(tw / 2, 17 * ui, "KEYNOTE 01:30", {
        fontFamily: MONO,
        fontSize: `${13 * ui}px`,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    timerWrap.add(this.timerText);

    /* pause button (top-right) */
    const pb = this.add.container(GAME_WIDTH - 10 - 40 * ui, 12, [panel(this, 40 * ui, 40 * ui)]);
    const pauseGlyph = this.add
      .text(20 * ui, 20 * ui, "❚❚", {
        fontFamily: GROTESK,
        fontSize: `${13 * ui}px`,
        color: palette.ink,
      })
      .setOrigin(0.5);
    pb.add(pauseGlyph);
    pb.setSize(40 * ui, 40 * ui);
    const pauseHit = this.add
      .rectangle(GAME_WIDTH - 10 - 20 * ui, 12 + 20 * ui, 48 * ui, 48 * ui, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    pauseHit.on("pointerdown", () => this.togglePause());

    /* progress bar */
    const barY = 66 * ui;
    const barW = GAME_WIDTH - 190;
    const barX = GAME_WIDTH / 2 - barW / 2;
    this.add.rectangle(barX + barW / 2, barY, barW, 10, 0xffffff).setStrokeStyle(2, 0x1e1e1e);
    this.progressFill = this.add
      .rectangle(barX + 1, barY, 1, 6, hc ? 0x1e7a3c : 0x34a853)
      .setOrigin(0, 0.5);
    // venue flag at the end
    this.add
      .text(barX + barW + 8, barY, "🏁", { fontSize: "13px" })
      .setOrigin(0, 0.5);
    this.carMarker = this.add
      .rectangle(barX, barY, 8, 14, 0xea4335)
      .setStrokeStyle(2, 0x1e1e1e);

    /* integrity pips (bottom-left) */
    const pipY = GAME_HEIGHT - 26;
    this.add
      .text(12, pipY - 24, "VAN HEALTH", {
        fontFamily: MONO,
        fontSize: `${8 * ui}px`,
        color: "#ffffff",
        backgroundColor: palette.ink,
        padding: { x: 3, y: 1 },
      })
      .setAlpha(0.85);
    for (let i = 0; i < RUN.maxIntegrity; i++) {
      const pip = this.add
        .rectangle(20 + i * (26 * ui), pipY, 20 * ui, 16 * ui, 0x34a853)
        .setStrokeStyle(2, 0x1e1e1e);
      this.pips.push(pip);
    }
    this.shieldIcon = this.add
      .circle(20 + RUN.maxIntegrity * 26 * ui + 4, pipY, 10 * ui, 0x4285f4, 0.9)
      .setStrokeStyle(2, 0x1e1e1e)
      .setVisible(this.runScene.getHudSnapshot().shielded);

    /* power-up button (bottom-right) */
    const pwSize = 62 * ui;
    const pwX = GAME_WIDTH - 16 - pwSize / 2;
    const pwY = GAME_HEIGHT - 20 - pwSize / 2;
    const pwPanel = panel(this, pwSize, pwSize);
    pwPanel.setPosition(-pwSize / 2, -pwSize / 2);
    this.powerIcon = this.add.image(0, 0, "pow-coffee").setScale(1.1 * ui);
    this.powerTimerArc = this.add.graphics();
    this.powerHint = this.add
      .text(0, pwSize / 2 + 12, this.sys.game.device.input.touch ? "TAP" : "SPACE", {
        fontFamily: MONO,
        fontSize: `${9 * ui}px`,
        color: "#ffffff",
        backgroundColor: palette.ink,
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5);
    this.powerBtn = this.add
      .container(pwX, pwY, [pwPanel, this.powerIcon, this.powerTimerArc, this.powerHint])
      .setVisible(false);
    const powerHit = this.add
      .rectangle(pwX, pwY, pwSize + 16, pwSize + 16, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    powerHit.on("pointerdown", () => this.runScene.requestActivatePower());

    /* damage flash */
    this.damageFlash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xea4335, 0)
      .setDepth(50);

    /* toast */
    this.toast = this.add
      .text(GAME_WIDTH / 2, 100 * ui, "", {
        fontFamily: MONO,
        fontSize: `${11 * ui}px`,
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: palette.ink,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(51);

    /* GO! */
    this.goText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, "GO!", {
        fontFamily: GROTESK,
        fontSize: "56px",
        fontStyle: "bold",
        color: palette.ink,
        backgroundColor: palette.pastelYellow,
        padding: { x: 18, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(52)
      .setScale(0.4)
      .setAlpha(0);
    this.tweens.add({
      targets: this.goText,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({ targets: this.goText, alpha: 0, delay: 550, duration: 250 });
      },
    });

    if (this.cfg.showTutorial) this.showTutorial();

    this.buildPauseOverlay();

    /* run scene events */
    const rs = this.runScene.events;
    rs.on("hud:combo", this.onCombo, this);
    rs.on("hud:integrity", this.onIntegrity, this);
    rs.on("hud:power", this.onPower, this);
    rs.on("hud:damageFlash", this.onDamage, this);
    rs.on("hud:toast", this.onToast, this);
    rs.on("hud:requestPause", this.pauseGame, this);
    rs.on("hud:firstInput", this.dismissTutorial, this);
    rs.on("hud:arrival", this.onArrival, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      rs.off("hud:combo", this.onCombo, this);
      rs.off("hud:integrity", this.onIntegrity, this);
      rs.off("hud:power", this.onPower, this);
      rs.off("hud:damageFlash", this.onDamage, this);
      rs.off("hud:toast", this.onToast, this);
      rs.off("hud:requestPause", this.pauseGame, this);
      rs.off("hud:firstInput", this.dismissTutorial, this);
      rs.off("hud:arrival", this.onArrival, this);
    });

    // window-level so pause always works, regardless of which scene has
    // keyboard focus inside Phaser
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        this.togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", onKey);
    });
  }

  private showTutorial(): void {
    const touch = this.sys.game.device.input.touch;
    const lines = touch
      ? "SWIPE OR TAP SIDES\nTO CHANGE LANES"
      : "← → OR A/D TO STEER\nSPACE FOR POWER-UPS";
    const bg = panel(this, 250, 64, 0xffe7a5);
    bg.setPosition(-125, -32);
    const label = this.add
      .text(0, 0, lines, {
        fontFamily: GROTESK,
        fontSize: "15px",
        fontStyle: "bold",
        color: palette.ink,
        align: "center",
      })
      .setOrigin(0.5);
    this.tutorial = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, [bg, label])
      .setDepth(52);
    this.time.delayedCall(4200, () => this.dismissTutorial());
  }

  private dismissTutorial(): void {
    if (!this.tutorial) return;
    const t = this.tutorial;
    this.tutorial = null;
    this.tweens.add({ targets: t, alpha: 0, duration: 250, onComplete: () => t.destroy() });
  }

  /* ------------------------------ events ------------------------------- */

  private onCombo(e: { count: number; mult: number }): void {
    if (e.mult > 1) {
      this.comboChip.setVisible(true);
      this.comboText.setText(`x${e.mult}`);
      if (e.mult !== this.lastComboMult && !this.cfg.settings.reducedMotion) {
        this.tweens.add({
          targets: this.comboChip,
          scale: { from: 1.35, to: 1 },
          duration: 200,
          ease: "Back.easeOut",
        });
      }
    } else {
      this.comboChip.setVisible(false);
    }
    this.lastComboMult = e.mult;
  }

  private onIntegrity(e: { integrity: number; shielded: boolean }): void {
    this.pips.forEach((pip, i) => {
      const alive = i < e.integrity;
      pip.setFillStyle(alive ? 0x34a853 : 0x3a3a3a, alive ? 1 : 0.5);
    });
    this.shieldIcon.setVisible(e.shielded);
  }

  private onPower(e: { stored: PowerUpKind | null; active: PowerUpKind | null }): void {
    if (e.stored) {
      this.powerBtn.setVisible(true);
      this.powerIcon.setTexture(POWER_TEXTURE[e.stored]);
      if (!this.cfg.settings.reducedMotion) {
        this.tweens.add({
          targets: this.powerBtn,
          scale: { from: 1.2, to: 1 },
          duration: 220,
          ease: "Back.easeOut",
        });
      }
    } else {
      this.powerBtn.setVisible(false);
      if (e.active) this.onToast(`${POWER_LABEL[e.active]} ACTIVE`);
    }
  }

  private onDamage(): void {
    this.damageFlash.setFillStyle(0xea4335, 0.24);
    this.tweens.add({ targets: this.damageFlash, fillAlpha: 0, duration: 320 });
  }

  private onToast(msg: string): void {
    this.toastTween?.stop();
    this.toast.setText(msg).setAlpha(0).setY(92 * this.ui);
    this.toastTween = this.tweens.add({
      targets: this.toast,
      alpha: 1,
      y: 100 * this.ui,
      duration: 220,
      onComplete: () => {
        this.toastTween = this.tweens.add({
          targets: this.toast,
          alpha: 0,
          delay: 1700,
          duration: 300,
        });
      },
    });
  }

  private onArrival(): void {
    this.dismissTutorial();
    this.onToast("WELCOME TO DEVFEST LAGOS!");
  }

  /* ------------------------------- pause ------------------------------- */

  private buildPauseOverlay(): void {
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1e1e1e, 0.55);
    const pw = 260;
    const ph = 300;
    const box = panel(this, pw, ph, 0xf0f0f0);
    box.setPosition(-pw / 2, -ph / 2);
    const title = this.add
      .text(0, -ph / 2 + 34, "PAUSED", {
        fontFamily: GROTESK,
        fontSize: "26px",
        fontStyle: "bold",
        color: palette.ink,
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, -ph / 2 + 60, "THE TRAFFIC WAITS. FOR ONCE.", {
        fontFamily: MONO,
        fontSize: "9px",
        color: "#5f5f5f",
      })
      .setOrigin(0.5);

    const mkBtn = (
      y: number,
      label: string,
      fill: number,
      color: string,
      cb: () => void,
    ): Phaser.GameObjects.Container => {
      const bw = 200;
      const bh = 40;
      const bg = panel(this, bw, bh, fill);
      bg.setPosition(-bw / 2, -bh / 2);
      const txt = this.add
        .text(0, 0, label, {
          fontFamily: GROTESK,
          fontSize: "15px",
          fontStyle: "bold",
          color,
        })
        .setOrigin(0.5);
      const c = this.add.container(0, y, [bg, txt]);
      const hit = this.add
        .rectangle(0, y, bw, bh, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        gameAudio.play("uiClick");
        cb();
      });
      c.add(hit);
      hit.setPosition(0, 0);
      return c;
    };

    const resume = mkBtn(-ph / 2 + 104, "RESUME", 0x1e1e1e, "#ffffff", () => this.resumeGame());
    const restart = mkBtn(-ph / 2 + 154, "RESTART RUN", 0xffffff, palette.ink, () => {
      this.resumeGame();
      this.game.events.emit("run:restart");
    });
    const quit = mkBtn(-ph / 2 + 204, "EXIT TO MENU", 0xffffff, palette.ink, () => {
      this.resumeGame();
      this.game.events.emit("run:quit");
    });

    /* sound toggles */
    const mkToggle = (
      x: number,
      label: string,
      initial: boolean,
      cb: (on: boolean) => void,
    ): Phaser.GameObjects.Text => {
      let on = initial;
      const t = this.add
        .text(x, ph / 2 - 34, `${label} ${on ? "ON" : "OFF"}`, {
          fontFamily: MONO,
          fontSize: "10px",
          fontStyle: "bold",
          color: on ? palette.ink : "#8a8a8a",
          backgroundColor: on ? "#ccf6c5" : "#e3e3e3",
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on("pointerdown", () => {
        on = !on;
        t.setText(`${label} ${on ? "ON" : "OFF"}`);
        t.setColor(on ? palette.ink : "#8a8a8a");
        t.setBackgroundColor(on ? "#ccf6c5" : "#e3e3e3");
        cb(on);
      });
      return t;
    };
    const musicT = mkToggle(-52, "MUSIC", this.cfg.settings.music, (on) => {
      gameAudio.setMusicOn(on);
      this.game.events.emit("settings:music", on);
    });
    const sfxT = mkToggle(52, "SFX", this.cfg.settings.sfx, (on) => {
      gameAudio.setSfxOn(on);
      this.game.events.emit("settings:sfx", on);
    });

    this.pauseOverlay = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        dim,
        box,
        title,
        sub,
        resume,
        restart,
        quit,
        musicT,
        sfxT,
      ])
      .setDepth(60)
      .setVisible(false);
    dim.setPosition(0, 0);
  }

  private togglePause(): void {
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  private pauseGame(): void {
    if (this.paused) return;
    const snap = this.runScene.getHudSnapshot();
    if (snap.state === "done") return;
    this.paused = true;
    this.scene.pause("run");
    this.pauseOverlay.setVisible(true);
    gameAudio.suspend();
  }

  private resumeGame(): void {
    if (!this.paused) return;
    this.paused = false;
    this.scene.resume("run");
    this.pauseOverlay.setVisible(false);
    gameAudio.resume();
  }

  /* ------------------------------- update ------------------------------ */

  update(): void {
    if (this.paused) return;
    const s = this.runScene.getHudSnapshot();

    this.scoreText.setText(s.score.toLocaleString());

    const secs = Math.ceil(s.remaining);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    this.timerText.setText(`KEYNOTE ${mm}:${ss}`);
    if (secs <= 10) {
      this.timerText.setColor(Math.sin(this.time.now / 120) > 0 ? "#ffb3ab" : "#ffffff");
    } else {
      this.timerText.setColor("#ffffff");
    }

    const barW = GAME_WIDTH - 190;
    this.progressFill.width = Math.max(1, barW * s.progress - 2);
    this.carMarker.x = GAME_WIDTH / 2 - barW / 2 + barW * s.progress;

    // active power-up duration ring
    this.powerTimerArc.clear();
    const timers = s.activeTimers;
    const active = timers.coffee > 0 ? timers.coffee / 4 : timers.wifi > 0 ? timers.wifi / 4 : timers.gemini > 0 ? timers.gemini / 6 : 0;
    if (active > 0) {
      this.powerTimerArc.lineStyle(4, 0x34a853, 1);
      this.powerTimerArc.beginPath();
      this.powerTimerArc.arc(0, 0, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * active, false);
      this.powerTimerArc.strokePath();
      if (!this.powerBtn.visible) {
        // show just the ring near the slot position while an effect runs
        this.powerBtn.setVisible(true);
        this.powerIcon.setVisible(false);
        this.powerHint.setVisible(false);
      }
    } else if (this.powerBtn.visible && !this.powerIcon.visible && !s.storedPower) {
      this.powerBtn.setVisible(false);
      this.powerIcon.setVisible(true);
      this.powerHint.setVisible(true);
    } else if (s.storedPower && !this.powerIcon.visible) {
      this.powerIcon.setVisible(true);
      this.powerHint.setVisible(true);
    }
  }
}
