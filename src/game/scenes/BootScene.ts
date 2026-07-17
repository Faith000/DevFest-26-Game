import * as Phaser from "phaser";
import { generateAllTextures } from "../assets/textures";
import type { RunSceneConfig } from "../types";

/** Generates every procedural texture once, then hands over to the run. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    generateAllTextures(this);
    const cfg = this.registry.get("runConfig") as RunSceneConfig;
    this.scene.start("run", cfg);
  }
}
