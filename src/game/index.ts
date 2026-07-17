import * as Phaser from "phaser";
import { palette } from "@/config/theme";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { RunScene } from "./scenes/RunScene";
import { HudScene } from "./scenes/HudScene";
import type { RunFinishedPayload, RunSceneConfig } from "./types";

export interface GameHandle {
  restart: (cfg: RunSceneConfig) => void;
  destroy: () => void;
}

export interface CreateGameOptions {
  parent: HTMLElement;
  config: RunSceneConfig;
  onFinished: (payload: RunFinishedPayload) => void;
  onQuit: () => void;
  onSettingChanged: (key: "music" | "sfx", value: boolean) => void;
}

export function createGame(opts: CreateGameOptions): GameHandle {
  // ?simloop switches Phaser to its setTimeout loop — used by automated
  // browser tests where requestAnimationFrame is suspended.
  const simLoop =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("simloop");

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: palette.paper,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 2 },
    fps: simLoop ? { forceSetTimeOut: true, target: 30 } : undefined,
    scene: [BootScene, RunScene, HudScene],
  });

  // BootScene auto-starts without data; it reads the config from the registry.
  game.registry.set("runConfig", opts.config);

  game.events.on("run:finished", opts.onFinished);
  game.events.on("run:quit", opts.onQuit);
  game.events.on("settings:music", (v: boolean) => opts.onSettingChanged("music", v));
  game.events.on("settings:sfx", (v: boolean) => opts.onSettingChanged("sfx", v));

  let lastConfig = opts.config;
  game.events.on("run:restart", () => {
    game.scene.stop("hud");
    game.scene.stop("run");
    game.scene.start("run", lastConfig);
  });

  return {
    restart: (cfg: RunSceneConfig) => {
      lastConfig = cfg;
      game.scene.stop("hud");
      game.scene.stop("run");
      game.scene.start("run", cfg);
    },
    destroy: () => {
      game.destroy(true);
    },
  };
}
