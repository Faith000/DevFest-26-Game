/**
 * Procedural texture painter.
 *
 * Every sprite in the game is generated here at boot with Phaser Graphics,
 * in one consistent illustrated style derived from devfestlagos.com:
 * flat colour fills, 2px ink outlines, square-ish geometry, pastel + core
 * Google accents. No external image assets, nothing to license.
 */
import * as Phaser from "phaser";
import { gamePalette as P } from "@/config/theme";
import { GAME_WIDTH, LANE_WIDTH, ROAD_LEFT, ROAD_WIDTH } from "../constants";

const INK = P.ink;
const DANFO_YELLOW = 0xf6c445;
const DANFO_YELLOW_DARK = 0xe0a935;

type G = Phaser.GameObjects.Graphics;

function mk(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: G) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function outlined(g: G, width = 2, color = INK, alpha = 1): void {
  g.lineStyle(width, color, alpha);
}

/** Little wheels poking out from under a vehicle body. */
function wheels(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x141414, 1);
  const wy = [y + h * 0.16, y + h * 0.72];
  for (const yy of wy) {
    g.fillRoundedRect(x - 5, yy, 7, h * 0.14, 2);
    g.fillRoundedRect(x + w - 2, yy, 7, h * 0.14, 2);
  }
}

/* ------------------------------------------------------------------ */
/* Road                                                                */
/* ------------------------------------------------------------------ */

function roadTile(scene: Phaser.Scene, key: string, asphalt: number, wet: boolean): void {
  const H = 256;
  mk(scene, key, GAME_WIDTH, H, (g) => {
    // shoulders
    g.fillStyle(P.dirt, 1);
    g.fillRect(0, 0, GAME_WIDTH, H);
    // asphalt
    g.fillStyle(asphalt, 1);
    g.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    // kerbs
    g.fillStyle(P.kerb, 1);
    g.fillRect(ROAD_LEFT - 8, 0, 8, H);
    g.fillRect(ROAD_LEFT + ROAD_WIDTH, 0, 8, H);
    g.fillStyle(INK, 1);
    for (let y = 0; y < H; y += 32) {
      g.fillRect(ROAD_LEFT - 8, y, 8, 16);
      g.fillRect(ROAD_LEFT + ROAD_WIDTH, y + 16, 8, 16);
    }
    // lane dashes
    g.fillStyle(P.laneLine, wet ? 0.7 : 0.9);
    for (let lane = 1; lane < 3; lane++) {
      const x = ROAD_LEFT + LANE_WIDTH * lane - 3;
      for (let y = 8; y < H; y += 64) g.fillRoundedRect(x, y, 6, 34, 3);
    }
    // edge lines
    g.fillStyle(P.laneLine, wet ? 0.55 : 0.8);
    g.fillRect(ROAD_LEFT + 4, 0, 4, H);
    g.fillRect(ROAD_LEFT + ROAD_WIDTH - 8, 0, 4, H);
    // texture speckles
    g.fillStyle(wet ? 0xffffff : 0x000000, wet ? 0.05 : 0.12);
    const rnd = new Phaser.Math.RandomDataGenerator(["road" + key]);
    for (let i = 0; i < 46; i++) {
      g.fillCircle(
        ROAD_LEFT + rnd.between(8, ROAD_WIDTH - 8),
        rnd.between(0, H),
        rnd.between(1, 3),
      );
    }
    if (wet) {
      g.fillStyle(0x9fd8ff, 0.1);
      for (let i = 0; i < 7; i++) {
        g.fillEllipse(
          ROAD_LEFT + rnd.between(20, ROAD_WIDTH - 20),
          rnd.between(10, H - 10),
          rnd.between(24, 58),
          rnd.between(6, 12),
        );
      }
    }
  });
}

function flyoverTile(scene: Phaser.Scene): void {
  const H = 256;
  mk(scene, "road-flyover", GAME_WIDTH, H, (g) => {
    // sky beside the flyover
    g.fillStyle(0xbde3f2, 1);
    g.fillRect(0, 0, GAME_WIDTH, H);
    // lagoon glints
    g.fillStyle(0xffffff, 0.35);
    const rnd = new Phaser.Math.RandomDataGenerator(["fly"]);
    for (let i = 0; i < 10; i++) {
      g.fillEllipse(rnd.between(4, 44), rnd.between(0, H), rnd.between(10, 26), 4);
      g.fillEllipse(GAME_WIDTH - rnd.between(4, 44), rnd.between(0, H), rnd.between(10, 26), 4);
    }
    // concrete deck
    g.fillStyle(0x8d8d94, 1);
    g.fillRect(ROAD_LEFT - 16, 0, ROAD_WIDTH + 32, H);
    g.fillStyle(0x55555c, 1);
    g.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    // deck joints
    g.fillStyle(0x3c3c42, 1);
    for (let y = 24; y < H; y += 128) g.fillRect(ROAD_LEFT, y, ROAD_WIDTH, 4);
    // guardrails
    for (const x of [ROAD_LEFT - 16, ROAD_LEFT + ROAD_WIDTH + 4]) {
      g.fillStyle(0xd7d7dc, 1);
      g.fillRect(x, 0, 12, H);
      g.fillStyle(INK, 1);
      for (let y = 8; y < H; y += 40) g.fillRect(x, y, 12, 5);
    }
    // lane dashes
    g.fillStyle(P.laneLine, 0.9);
    for (let lane = 1; lane < 3; lane++) {
      const x = ROAD_LEFT + LANE_WIDTH * lane - 3;
      for (let y = 8; y < H; y += 64) g.fillRoundedRect(x, y, 6, 34, 3);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

function vehicleBase(
  g: G,
  w: number,
  h: number,
  body: number,
  roof: number,
): void {
  wheels(g, 6, 4, w - 12, h - 8);
  outlined(g);
  g.fillStyle(body, 1);
  g.fillRoundedRect(6, 2, w - 12, h - 4, 10);
  g.strokeRoundedRect(6, 2, w - 12, h - 4, 10);
  // windshield (front = top)
  g.fillStyle(0x25313d, 1);
  g.fillRoundedRect(11, h * 0.12, w - 22, h * 0.14, 4);
  // roof
  g.fillStyle(roof, 1);
  g.fillRoundedRect(11, h * 0.3, w - 22, h * 0.42, 6);
  outlined(g, 2, INK, 0.55);
  g.strokeRoundedRect(11, h * 0.3, w - 22, h * 0.42, 6);
  // rear window
  g.fillStyle(0x25313d, 1);
  g.fillRoundedRect(13, h * 0.78, w - 26, h * 0.1, 4);
}

function texShuttle(scene: Phaser.Scene): void {
  const w = 72;
  const h = 116;
  mk(scene, "veh-shuttle", w, h, (g) => {
    vehicleBase(g, w, h, 0x4285f4, 0xffffff);
    // DevFest roof marker: four community dots
    const cx = w / 2;
    const dots = [P.red, P.blue, P.green, P.amber];
    dots.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(cx - 18 + i * 12, h * 0.51, 4.5);
      outlined(g, 1.5);
      g.strokeCircle(cx - 18 + i * 12, h * 0.51, 4.5);
    });
    // headlights
    g.fillStyle(0xfff2b8, 1);
    g.fillRoundedRect(12, 3, 12, 5, 2);
    g.fillRoundedRect(w - 24, 3, 12, 5, 2);
  });
}

function texDanfo(scene: Phaser.Scene, key: string, weathered: boolean): void {
  const w = 76;
  const h = 124;
  mk(scene, key, w, h, (g) => {
    vehicleBase(
      g,
      w,
      h,
      weathered ? DANFO_YELLOW_DARK : DANFO_YELLOW,
      weathered ? 0xd9a63a : 0xf9d16a,
    );
    // the classic black side stripe, visible along the edges of the roof
    g.fillStyle(0x141414, 1);
    g.fillRect(6, h * 0.42, 6, h * 0.26);
    g.fillRect(w - 12, h * 0.42, 6, h * 0.26);
    // roof rack lines
    outlined(g, 2, INK, 0.4);
    for (let i = 0; i < 3; i++) {
      g.lineBetween(16, h * 0.36 + i * 12, w - 16, h * 0.36 + i * 12);
    }
    g.fillStyle(0xfff2b8, 1);
    g.fillRoundedRect(12, 3, 13, 5, 2);
    g.fillRoundedRect(w - 25, 3, 13, 5, 2);
    if (weathered) {
      // a proud dent
      g.fillStyle(0x00000, 0.18);
      g.fillEllipse(w - 18, h * 0.62, 12, 8);
    }
  });
}

function texBike(scene: Phaser.Scene, key: string, jacket: number, boxColor?: number): void {
  const w = 42;
  const h = 88;
  mk(scene, key, w, h, (g) => {
    const cx = w / 2;
    // wheels
    g.fillStyle(0x141414, 1);
    g.fillRoundedRect(cx - 4, 2, 8, 18, 4);
    g.fillRoundedRect(cx - 4, h - 22, 8, 18, 4);
    // frame
    outlined(g);
    g.fillStyle(0x3d3d44, 1);
    g.fillRoundedRect(cx - 6, 16, 12, h - 36, 5);
    g.strokeRoundedRect(cx - 6, 16, 12, h - 36, 5);
    // handlebars
    g.fillStyle(0x141414, 1);
    g.fillRoundedRect(cx - 16, 20, 32, 5, 2);
    // delivery box (rear)
    if (boxColor !== undefined) {
      g.fillStyle(boxColor, 1);
      g.fillRoundedRect(cx - 14, h - 30, 28, 24, 4);
      outlined(g);
      g.strokeRoundedRect(cx - 14, h - 30, 28, 24, 4);
      g.lineBetween(cx, h - 30, cx, h - 6);
    }
    // rider: shoulders + helmet
    g.fillStyle(jacket, 1);
    g.fillEllipse(cx, 40, 30, 22);
    outlined(g);
    g.strokeEllipse(cx, 40, 30, 22);
    g.fillStyle(P.green, 1);
    g.fillCircle(cx, 36, 9);
    outlined(g);
    g.strokeCircle(cx, 36, 9);
    g.fillStyle(0xffffff, 0.65);
    g.fillEllipse(cx - 3, 33, 7, 4);
  });
}

function texTruck(scene: Phaser.Scene): void {
  const w = 84;
  const h = 152;
  mk(scene, "obs-truck", w, h, (g) => {
    wheels(g, 8, 8, w - 16, h - 16);
    outlined(g);
    // flatbed
    g.fillStyle(0x9aa2ab, 1);
    g.fillRoundedRect(8, 34, w - 16, h - 40, 6);
    g.strokeRoundedRect(8, 34, w - 16, h - 40, 6);
    // load: tarp + crates
    g.fillStyle(P.pastelGreen, 1);
    g.fillRoundedRect(14, 44, w - 28, 62, 5);
    g.strokeRoundedRect(14, 44, w - 28, 62, 5);
    outlined(g, 2, INK, 0.5);
    g.lineBetween(14, 66, w - 14, 66);
    g.lineBetween(14, 88, w - 14, 88);
    g.fillStyle(P.pastelYellow, 1);
    g.fillRoundedRect(18, 112, 22, 22, 3);
    g.fillRoundedRect(44, 112, 22, 22, 3);
    outlined(g);
    g.strokeRoundedRect(18, 112, 22, 22, 3);
    g.strokeRoundedRect(44, 112, 22, 22, 3);
    // cab at the front (top)
    g.fillStyle(0x4285f4, 1);
    g.fillRoundedRect(10, 4, w - 20, 34, 8);
    g.strokeRoundedRect(10, 4, w - 20, 34, 8);
    g.fillStyle(0x25313d, 1);
    g.fillRoundedRect(15, 8, w - 30, 10, 3);
  });
}

function texCarBroken(scene: Phaser.Scene): void {
  const w = 70;
  const h = 142; // car + warning triangle behind
  mk(scene, "obs-broken", w, h, (g) => {
    // car
    wheels(g, 6, 6, w - 12, 100);
    outlined(g);
    g.fillStyle(P.pastelPink, 1);
    g.fillRoundedRect(6, 2, w - 12, 104, 10);
    g.strokeRoundedRect(6, 2, w - 12, 104, 10);
    // popped hood (front top), akimbo
    g.fillStyle(0xd8b4b4, 1);
    g.fillRoundedRect(10, 2, w - 20, 26, 6);
    g.strokeRoundedRect(10, 2, w - 20, 26, 6);
    // smoke handled at runtime; window band
    g.fillStyle(0x25313d, 1);
    g.fillRoundedRect(12, 34, w - 24, 14, 4);
    g.fillStyle(0xe8c9c9, 1);
    g.fillRoundedRect(12, 52, w - 24, 34, 5);
    outlined(g, 2, INK, 0.5);
    g.strokeRoundedRect(12, 52, w - 24, 34, 5);
    // hazard triangle placed behind (below)
    outlined(g, 3, P.red, 1);
    g.strokeTriangle(w / 2, 116, w / 2 - 13, 138, w / 2 + 13, 138);
    outlined(g, 1.5, INK, 1);
    g.strokeTriangle(w / 2, 112, w / 2 - 17, 141, w / 2 + 17, 141);
  });
}

function texOkada(scene: Phaser.Scene): void {
  texBike(scene, "obs-okada", P.red);
}

/* ------------------------------------------------------------------ */
/* Static hazards                                                      */
/* ------------------------------------------------------------------ */

function texPothole(scene: Phaser.Scene): void {
  const s = 62;
  mk(scene, "obs-pothole", s, 46, (g) => {
    g.fillStyle(0x1b1b1f, 1);
    g.fillEllipse(s / 2, 23, 54, 34);
    g.lineStyle(3, 0x6e6e76, 1);
    g.strokeEllipse(s / 2, 23, 54, 34);
    // cracks
    g.lineStyle(2, 0x6e6e76, 0.8);
    g.lineBetween(4, 12, 12, 18);
    g.lineBetween(s - 4, 34, s - 13, 28);
    g.lineBetween(s - 8, 8, s - 15, 15);
    // water glint
    g.fillStyle(0x9fd8ff, 0.25);
    g.fillEllipse(s / 2 - 6, 20, 20, 8);
  });
}

function texBarrier(scene: Phaser.Scene): void {
  const w = 92;
  const h = 74;
  mk(scene, "obs-barrier", w, h, (g) => {
    // legs
    g.fillStyle(INK, 1);
    g.fillRect(10, 26, 8, 40);
    g.fillRect(w - 18, 26, 8, 40);
    // striped board
    outlined(g);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(4, 6, w - 8, 26, 4);
    g.fillStyle(0xf28b30, 1);
    for (let x = 8; x < w - 10; x += 22) {
      g.beginPath();
      g.moveTo(x, 8);
      g.lineTo(x + 11, 8);
      g.lineTo(x + 1, 30);
      g.lineTo(x - 10, 30);
      g.closePath();
      g.fillPath();
    }
    g.strokeRoundedRect(4, 6, w - 8, 26, 4);
    // cone buddy
    g.fillStyle(0xf28b30, 1);
    g.fillTriangle(w / 2, 40, w / 2 - 11, 68, w / 2 + 11, 68);
    outlined(g);
    g.strokeTriangle(w / 2, 40, w / 2 - 11, 68, w / 2 + 11, 68);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w / 2 - 7, 54, 14, 6);
  });
}

function texSpinner(scene: Phaser.Scene): void {
  const s = 84;
  mk(scene, "obs-spinner", s, s, (g) => {
    const c = s / 2;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 36);
    outlined(g);
    g.strokeCircle(c, c, 36);
    // loading arc segments
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const alpha = 0.15 + (i / 8) * 0.85;
      g.fillStyle(P.blue, alpha);
      g.save();
      g.translateCanvas(c + Math.cos(a) * 22, c + Math.sin(a) * 22);
      g.rotateCanvas(a);
      g.fillRoundedRect(-4, -9, 8, 18, 4);
      g.restore();
    }
    outlined(g, 2, INK, 0.35);
    g.strokeCircle(c, c, 12);
  });
}

function texApiGate(scene: Phaser.Scene): void {
  const w = 98;
  const h = 84;
  mk(scene, "obs-apigate", w, h, (g) => {
    // posts
    g.fillStyle(0x8d8d94, 1);
    g.fillRoundedRect(2, 10, 12, h - 14, 3);
    g.fillRoundedRect(w - 14, 10, 12, h - 14, 3);
    outlined(g);
    g.strokeRoundedRect(2, 10, 12, h - 14, 3);
    g.strokeRoundedRect(w - 14, 10, 12, h - 14, 3);
    // boom bar
    g.fillStyle(P.red, 1);
    g.fillRoundedRect(6, 26, w - 12, 16, 6);
    g.strokeRoundedRect(6, 26, w - 12, 16, 6);
    g.fillStyle(0xffffff, 1);
    for (let x = 14; x < w - 18; x += 24) g.fillRect(x, 29, 10, 10);
    // padlock
    g.fillStyle(P.amber, 1);
    g.fillRoundedRect(w / 2 - 12, 40, 24, 20, 4);
    outlined(g);
    g.strokeRoundedRect(w / 2 - 12, 40, 24, 20, 4);
    g.lineStyle(4, INK, 1);
    g.beginPath();
    g.arc(w / 2, 42, 8, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(INK, 1);
    g.fillCircle(w / 2, 49, 3);
  });
}

function texFigmaLayers(scene: Phaser.Scene): void {
  const w = 92;
  const h = 84;
  mk(scene, "obs-figma", w, h, (g) => {
    g.fillStyle(P.pastelPink, 0.8);
    g.fillRoundedRect(4, 26, 56, 44, 6);
    g.fillStyle(P.pastelBlue, 0.8);
    g.fillRoundedRect(26, 12, 58, 46, 6);
    outlined(g, 2, INK, 0.6);
    g.strokeRoundedRect(4, 26, 56, 44, 6);
    g.strokeRoundedRect(26, 12, 58, 46, 6);
    // top "selected" frame with dashed border + handles
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(14, 2, 54, 40, 6);
    g.lineStyle(2, P.blue, 1);
    // dashed rect
    const dash = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = 6;
      for (let i = 0; i < steps; i += 2) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        g.lineBetween(
          x1 + (x2 - x1) * t0,
          y1 + (y2 - y1) * t0,
          x1 + (x2 - x1) * t1,
          y1 + (y2 - y1) * t1,
        );
      }
    };
    dash(14, 2, 68, 2);
    dash(68, 2, 68, 42);
    dash(68, 42, 14, 42);
    dash(14, 42, 14, 2);
    g.fillStyle(0xffffff, 1);
    for (const [hx, hy] of [
      [14, 2],
      [68, 2],
      [14, 42],
      [68, 42],
    ]) {
      g.fillRect(hx - 3, hy - 3, 6, 6);
      g.lineStyle(1.5, P.blue, 1);
      g.strokeRect(hx - 3, hy - 3, 6, 6);
    }
  });
}

function texBug(scene: Phaser.Scene): void {
  const w = 86;
  const h = 66;
  mk(scene, "obs-bug", w, h, (g) => {
    const cx = w / 2 + 6;
    const cy = h / 2;
    // legs
    g.lineStyle(3, INK, 1);
    for (const side of [-1, 1]) {
      g.lineBetween(cx - 14, cy + side * 10, cx - 26, cy + side * 24);
      g.lineBetween(cx, cy + side * 12, cx - 4, cy + side * 27);
      g.lineBetween(cx + 13, cy + side * 10, cx + 22, cy + side * 24);
    }
    // body
    outlined(g);
    g.fillStyle(P.red, 1);
    g.fillEllipse(cx, cy, 52, 40);
    g.strokeEllipse(cx, cy, 52, 40);
    // wing split
    g.lineStyle(2, INK, 1);
    g.lineBetween(cx - 26, cy, cx + 26, cy);
    // spots
    g.fillStyle(INK, 1);
    g.fillCircle(cx - 12, cy - 9, 4.5);
    g.fillCircle(cx + 8, cy - 11, 3.5);
    g.fillCircle(cx - 8, cy + 10, 3.5);
    g.fillCircle(cx + 12, cy + 8, 4.5);
    // head (facing left = walking direction is set at runtime via flip)
    g.fillStyle(INK, 1);
    g.fillCircle(cx - 28, cy, 11);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 32, cy - 4, 3.4);
    g.fillCircle(cx - 32, cy + 4, 3.4);
    g.fillStyle(INK, 1);
    g.fillCircle(cx - 33, cy - 4, 1.6);
    g.fillCircle(cx - 33, cy + 4, 1.6);
    // antennae
    g.lineStyle(2.5, INK, 1);
    g.lineBetween(cx - 34, cy - 8, cx - 44, cy - 16);
    g.lineBetween(cx - 34, cy + 8, cx - 44, cy + 16);
    g.fillCircle(cx - 44, cy - 16, 3);
    g.fillCircle(cx - 44, cy + 16, 3);
  });
}

function texDeployZone(scene: Phaser.Scene): void {
  const w = Math.round(LANE_WIDTH * 2) - 8; // spans two lanes
  const h = 112;
  mk(scene, "obs-deploy", w, h, (g) => {
    // zone
    g.fillStyle(P.red, 0.18);
    g.fillRoundedRect(2, 2, w - 4, h - 4, 8);
    g.lineStyle(3, P.red, 0.9);
    g.strokeRoundedRect(2, 2, w - 4, h - 4, 8);
    // chevron tape top & bottom
    for (const y of [6, h - 26]) {
      g.fillStyle(P.amber, 1);
      g.fillRoundedRect(6, y, w - 12, 20, 4);
      outlined(g);
      g.strokeRoundedRect(6, y, w - 12, 20, 4);
      g.fillStyle(INK, 1);
      for (let x = 10; x < w - 22; x += 26) {
        g.beginPath();
        g.moveTo(x, y + 2);
        g.lineTo(x + 12, y + 2);
        g.lineTo(x + 2, y + 18);
        g.lineTo(x - 10, y + 18);
        g.closePath();
        g.fillPath();
      }
    }
    // warning lamp bases (lit at runtime)
    g.fillStyle(INK, 1);
    g.fillRect(10, h / 2 - 8, 12, 16);
    g.fillRect(w - 22, h / 2 - 8, 12, 16);
  });
}

/* ------------------------------------------------------------------ */
/* Pickups                                                             */
/* ------------------------------------------------------------------ */

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

function texPickups(scene: Phaser.Scene): void {
  mk(scene, "pick-star", 36, 36, (g) => {
    const pts = starPoints(18, 19, 16, 7.5);
    g.fillStyle(P.amber, 1);
    g.fillPoints(pts, true);
    outlined(g);
    g.strokePoints(pts, true, true);
  });

  mk(scene, "pick-code", 34, 34, (g) => {
    outlined(g);
    g.fillStyle(INK, 1);
    g.fillRoundedRect(2, 2, 30, 30, 8);
    g.lineStyle(3, 0xffffff, 1);
    // < >
    g.lineBetween(13, 11, 7, 17);
    g.lineBetween(7, 17, 13, 23);
    g.lineBetween(21, 11, 27, 17);
    g.lineBetween(27, 17, 21, 23);
    // slash
    g.lineBetween(19, 9, 15, 25);
  });

  mk(scene, "pick-wifi", 38, 34, (g) => {
    const cx = 19;
    const cy = 27;
    for (let i = 3; i >= 1; i--) {
      g.lineStyle(4, P.blue, 1);
      g.beginPath();
      g.arc(cx, cy, i * 7 + 1, Math.PI * 1.22, Math.PI * 1.78, false);
      g.strokePath();
    }
    g.fillStyle(P.blue, 1);
    g.fillCircle(cx, cy, 3.6);
  });

  mk(scene, "pick-badge", 34, 42, (g) => {
    // lanyard
    g.lineStyle(3, P.red, 1);
    g.lineBetween(17, 2, 9, 12);
    g.lineBetween(17, 2, 25, 12);
    // card
    outlined(g);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(4, 10, 26, 30, 4);
    g.strokeRoundedRect(4, 10, 26, 30, 4);
    // clock face — the badge grants time
    g.lineStyle(2, INK, 1);
    g.strokeCircle(17, 22, 6.5);
    g.lineBetween(17, 22, 17, 17.5);
    g.lineBetween(17, 22, 20.5, 22);
    const dots = [P.red, P.blue, P.green, P.amber];
    dots.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(8.5 + i * 5.6, 34, 2.2);
    });
  });
}

function texPowerups(scene: Phaser.Scene): void {
  const box = (key: string, draw: (g: G) => void) => {
    mk(scene, key, 48, 48, (g) => {
      // hard offset shadow, like the site's cards
      g.fillStyle(INK, 1);
      g.fillRoundedRect(6, 6, 40, 40, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(2, 2, 40, 40, 8);
      outlined(g);
      g.strokeRoundedRect(2, 2, 40, 40, 8);
      draw(g);
    });
  };

  box("pow-coffee", (g) => {
    outlined(g);
    g.fillStyle(0x8a5a3b, 1);
    g.fillRoundedRect(12, 18, 18, 18, { tl: 3, tr: 3, bl: 7, br: 7 });
    g.strokeRoundedRect(12, 18, 18, 18, { tl: 3, tr: 3, bl: 7, br: 7 });
    // handle
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.arc(31, 26, 5.5, -Math.PI / 2, Math.PI / 2, false);
    g.strokePath();
    // steam
    g.lineStyle(2.5, P.red, 1);
    g.lineBetween(17, 9, 17, 14);
    g.lineBetween(22, 7, 22, 13);
    g.lineBetween(27, 9, 27, 14);
  });

  box("pow-shield", (g) => {
    // cloud
    g.fillStyle(P.pastelBlue, 1);
    g.fillCircle(16, 26, 8);
    g.fillCircle(23, 21, 10);
    g.fillCircle(30, 27, 7.5);
    g.fillRect(14, 26, 18, 8);
    outlined(g);
    g.strokeCircle(23, 21, 10);
    // check
    g.lineStyle(3.5, P.green, 1);
    g.lineBetween(18, 27, 22, 31);
    g.lineBetween(22, 31, 29, 21);
  });

  box("pow-wifi", (g) => {
    for (let i = 3; i >= 1; i--) {
      g.lineStyle(3.5, P.green, 1);
      g.beginPath();
      g.arc(22, 33, i * 6.5, Math.PI * 1.22, Math.PI * 1.78, false);
      g.strokePath();
    }
    g.fillStyle(P.green, 1);
    g.fillCircle(22, 33, 3);
  });

  box("pow-gemini", (g) => {
    // four-point sparkle (concave star from 8 points)
    const cx = 22;
    const cy = 24;
    const outer = 13;
    const inner = 3.4;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    g.fillStyle(P.blue, 1);
    g.fillPoints(pts, true);
    g.fillStyle(P.pastelBlue, 1);
    g.fillCircle(cx + 9, cy - 9, 3);
  });
}

/* ------------------------------------------------------------------ */
/* Roadside props                                                      */
/* ------------------------------------------------------------------ */

function texBuildings(scene: Phaser.Scene): void {
  const spec: Array<{ key: string; wall: number; accent: number }> = [
    { key: "prop-bldg-a", wall: P.pastelYellow, accent: P.red },
    { key: "prop-bldg-b", wall: 0xffffff, accent: P.blue },
    { key: "prop-bldg-c", wall: P.pastelPink, accent: P.green },
  ];
  spec.forEach(({ key, wall, accent }, idx) => {
    const w = 86;
    const h = 96 + idx * 12;
    mk(scene, key, w + 5, h + 5, (g) => {
      // hard shadow
      g.fillStyle(INK, 0.9);
      g.fillRect(5, 5, w, h);
      outlined(g);
      g.fillStyle(wall, 1);
      g.fillRect(0, 0, w, h);
      g.strokeRect(0, 0, w, h);
      // roofline
      g.fillStyle(accent, 1);
      g.fillRect(0, 0, w, 12);
      g.strokeRect(0, 0, w, 12);
      // windows
      g.fillStyle(0x25313d, 1);
      for (let ry = 22; ry < h - 30; ry += 24) {
        for (let rx = 10; rx < w - 18; rx += 26) {
          g.fillRoundedRect(rx, ry, 16, 14, 2);
        }
      }
      // door / shop shutter
      g.fillStyle(accent, 1);
      g.fillRoundedRect(w / 2 - 12, h - 26, 24, 26, { tl: 4, tr: 4, bl: 0, br: 0 });
      outlined(g);
      g.strokeRoundedRect(w / 2 - 12, h - 26, 24, 26, { tl: 4, tr: 4, bl: 0, br: 0 });
      if (idx === 2) {
        // striped awning
        g.fillStyle(0xffffff, 1);
        g.fillRect(6, 34, w - 12, 12);
        g.fillStyle(accent, 1);
        for (let x = 6; x < w - 12; x += 16) g.fillRect(x, 34, 8, 12);
        outlined(g);
        g.strokeRect(6, 34, w - 12, 12);
      }
    });
  });
}

function texPalm(scene: Phaser.Scene): void {
  const w = 76;
  const h = 84;
  mk(scene, "prop-palm", w, h, (g) => {
    const cx = w / 2;
    // trunk
    outlined(g);
    g.fillStyle(0xa9825a, 1);
    g.fillRoundedRect(cx - 5, 30, 10, h - 34, 4);
    g.strokeRoundedRect(cx - 5, 30, 10, h - 34, 4);
    // fronds
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.save();
      g.translateCanvas(cx, 28);
      g.rotateCanvas(a);
      g.fillStyle(i % 2 ? P.leaf : P.leafDark, 1);
      g.fillEllipse(16, 0, 30, 11);
      outlined(g, 1.5);
      g.strokeEllipse(16, 0, 30, 11);
      g.restore();
    }
    // coconuts
    g.fillStyle(0x8a5a3b, 1);
    g.fillCircle(cx - 5, 30, 4);
    g.fillCircle(cx + 5, 32, 4);
  });
}

function texTree(scene: Phaser.Scene): void {
  const s = 64;
  mk(scene, "prop-tree", s, s + 12, (g) => {
    outlined(g);
    g.fillStyle(0xa9825a, 1);
    g.fillRect(s / 2 - 4, s - 8, 8, 18);
    g.fillStyle(P.leaf, 1);
    g.fillCircle(s / 2, s / 2 - 4, 24);
    g.strokeCircle(s / 2, s / 2 - 4, 24);
    g.fillStyle(P.leafDark, 1);
    g.fillCircle(s / 2 - 10, s / 2 - 10, 9);
    g.fillCircle(s / 2 + 9, s / 2 + 2, 7);
  });
}

function texVendor(scene: Phaser.Scene): void {
  const w = 72;
  const h = 76;
  mk(scene, "prop-vendor", w, h, (g) => {
    // table
    outlined(g);
    g.fillStyle(0xa9825a, 1);
    g.fillRect(10, 46, w - 20, 22);
    g.strokeRect(10, 46, w - 20, 22);
    // goods
    const goods = [P.red, P.green, P.amber, P.pastelYellow];
    goods.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(18 + i * 12, 46, 5);
      outlined(g, 1.5);
      g.strokeCircle(18 + i * 12, 46, 5);
    });
    // umbrella
    g.fillStyle(P.red, 1);
    g.beginPath();
    g.moveTo(w / 2, 6);
    g.lineTo(w - 4, 32);
    g.lineTo(4, 32);
    g.closePath();
    g.fillPath();
    outlined(g);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(w / 2, 6);
    g.lineTo(w / 2 + 14, 32);
    g.lineTo(w / 2 - 14, 32);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, INK, 1);
    g.lineBetween(w / 2, 10, w / 2, 46);
  });
}

function texBusStop(scene: Phaser.Scene): void {
  const w = 92;
  const h = 66;
  mk(scene, "prop-busstop", w, h, (g) => {
    // shelter roof
    outlined(g);
    g.fillStyle(P.pastelBlue, 1);
    g.fillRoundedRect(2, 4, w - 4, 16, 4);
    g.strokeRoundedRect(2, 4, w - 4, 16, 4);
    // posts
    g.fillStyle(INK, 1);
    g.fillRect(8, 20, 5, h - 26);
    g.fillRect(w - 13, 20, 5, h - 26);
    // bench
    g.fillStyle(0xa9825a, 1);
    g.fillRect(16, h - 24, w - 32, 8);
    outlined(g);
    g.strokeRect(16, h - 24, w - 32, 8);
    // BRT sign
    g.fillStyle(P.blue, 1);
    g.fillRoundedRect(w / 2 - 10, 24, 20, 14, 3);
    outlined(g);
    g.strokeRoundedRect(w / 2 - 10, 24, 20, 14, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2 - 4, 31, 2.2);
    g.fillCircle(w / 2 + 4, 31, 2.2);
  });
}

function texBillboard(scene: Phaser.Scene): void {
  const w = 108;
  const h = 92;
  mk(scene, "prop-billboard", w, h, (g) => {
    // posts
    g.fillStyle(INK, 1);
    g.fillRect(w / 2 - 26, h - 26, 7, 26);
    g.fillRect(w / 2 + 19, h - 26, 7, 26);
    // hard shadow panel
    g.fillStyle(INK, 1);
    g.fillRect(8, 8, w - 12, 58);
    // face
    outlined(g);
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 4, w - 12, 58);
    g.strokeRect(4, 4, w - 12, 58);
    // corner dots (brand motif)
    const dots = [P.red, P.blue, P.green, P.amber];
    dots.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(14 + i * 10, 54, 3);
    });
  });
}

function texStreetLight(scene: Phaser.Scene): void {
  const w = 42;
  const h = 96;
  mk(scene, "prop-light", w, h, (g) => {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(6, 4, 30, 8, 4);
    g.fillRect(8, 4, 6, h - 4);
    g.fillStyle(0xfff2b8, 1);
    g.fillEllipse(30, 12, 14, 8);
    outlined(g, 1.5);
    g.strokeEllipse(30, 12, 14, 8);
  });
}

function texCrowd(scene: Phaser.Scene): void {
  const w = 128;
  const h = 46;
  mk(scene, "prop-crowd", w, h, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(["crowd"]);
    const shirts = [P.red, P.blue, P.green, P.amber, INK, 0xffffff];
    for (let i = 0; i < 9; i++) {
      const x = 8 + i * 13 + rnd.between(-2, 2);
      const y = h - 18 + rnd.between(-6, 4);
      const shirt = shirts[rnd.between(0, shirts.length - 1)];
      g.fillStyle(shirt, 1);
      g.fillRoundedRect(x - 6, y, 12, 16, 4);
      outlined(g, 1.5);
      g.strokeRoundedRect(x - 6, y, 12, 16, 4);
      const skin = [0x6b4530, 0x8a5a3b, 0x513425][rnd.between(0, 2)];
      g.fillStyle(skin, 1);
      g.fillCircle(x, y - 5, 5.5);
      outlined(g, 1.5);
      g.strokeCircle(x, y - 5, 5.5);
    }
  });
}

function texGate(scene: Phaser.Scene): void {
  const w = ROAD_WIDTH + 72;
  const h = 118;
  mk(scene, "prop-gate", w, h, (g) => {
    // posts
    outlined(g);
    for (const x of [4, w - 26]) {
      g.fillStyle(INK, 1);
      g.fillRect(x + 4, 34, 22, h - 34);
      g.fillStyle(0xffffff, 1);
      g.fillRect(x, 30, 22, h - 38);
      g.strokeRect(x, 30, 22, h - 38);
    }
    // header band with hard shadow
    g.fillStyle(INK, 1);
    g.fillRect(10, 12, w - 16, 40);
    g.fillStyle(0xffffff, 1);
    g.fillRect(6, 8, w - 16, 40);
    g.strokeRect(6, 8, w - 16, 40);
    // brand dots
    const dots = [P.red, P.blue, P.green, P.amber];
    dots.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(w / 2 - 27 + i * 18, 40, 5);
      outlined(g, 1.5);
      g.strokeCircle(w / 2 - 27 + i * 18, 40, 5);
    });
    // pennant strings
    g.lineStyle(2, INK, 1);
    g.lineBetween(15, 52, w / 2, 66);
    g.lineBetween(w / 2, 66, w - 15, 52);
    const cols = [P.red, P.blue, P.green, P.amber, P.red, P.blue, P.green, P.amber];
    cols.forEach((c, i) => {
      const t = (i + 0.5) / cols.length;
      const x = 15 + (w - 30) * t;
      const y = 52 + Math.sin(t * Math.PI) * 14;
      g.fillStyle(c, 1);
      g.fillTriangle(x - 6, y, x + 6, y, x, y + 12);
      outlined(g, 1.5);
      g.strokeTriangle(x - 6, y, x + 6, y, x, y + 12);
    });
  });
}

function texBannerFlag(scene: Phaser.Scene): void {
  const w = 34;
  const h = 78;
  mk(scene, "prop-flag", w, h, (g) => {
    g.fillStyle(INK, 1);
    g.fillRect(4, 4, 4, h - 8);
    outlined(g);
    g.fillStyle(P.green, 1);
    g.fillRoundedRect(8, 8, 22, 34, { tl: 0, tr: 6, bl: 0, br: 6 });
    g.strokeRoundedRect(8, 8, 22, 34, { tl: 0, tr: 6, bl: 0, br: 6 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(19, 25, 7);
    outlined(g, 1.5);
    g.strokeCircle(19, 25, 7);
  });
}

function texSkyline(scene: Phaser.Scene): void {
  const w = 130;
  const h = 92;
  mk(scene, "prop-skyline", w, h, (g) => {
    g.fillStyle(0x7e93a8, 1);
    const rnd = new Phaser.Math.RandomDataGenerator(["skyline"]);
    let x = 0;
    while (x < w - 12) {
      const bw = rnd.between(16, 30);
      const bh = rnd.between(28, h - 8);
      g.fillRect(x, h - bh, bw, bh);
      x += bw + 4;
    }
    g.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 16; i++) {
      g.fillRect(rnd.between(2, w - 6), rnd.between(h - 60, h - 8), 3, 4);
    }
  });
}

/* ------------------------------------------------------------------ */
/* FX + misc                                                           */
/* ------------------------------------------------------------------ */

function texFx(scene: Phaser.Scene): void {
  mk(scene, "fx-shadow", 80, 30, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(40, 15, 76, 26);
  });

  mk(scene, "fx-raindrop", 4, 18, (g) => {
    g.fillStyle(0xbfe3ff, 0.85);
    g.fillRoundedRect(0, 0, 3, 16, 2);
  });

  mk(scene, "fx-splash", 14, 6, (g) => {
    g.lineStyle(2, 0xbfe3ff, 0.8);
    g.strokeEllipse(7, 3, 12, 5);
  });

  mk(scene, "fx-confetti", 8, 10, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 10);
  });

  mk(scene, "fx-spark", 12, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(6, 0, 8, 6, 6, 12);
    g.fillTriangle(6, 0, 4, 6, 6, 12);
    g.fillTriangle(0, 6, 6, 4, 12, 6);
    g.fillTriangle(0, 6, 6, 8, 12, 6);
  });

  mk(scene, "fx-smoke", 22, 22, (g) => {
    g.fillStyle(0x9b9ba1, 0.75);
    g.fillCircle(11, 11, 9);
  });

  mk(scene, "fx-speedline", 3, 30, (g) => {
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(0, 0, 2, 28, 1);
  });

  mk(scene, "fx-shield", 108, 108, (g) => {
    g.fillStyle(P.pastelBlue, 0.28);
    g.fillCircle(54, 54, 50);
    g.lineStyle(3, P.blue, 0.85);
    g.strokeCircle(54, 54, 50);
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.arc(54, 54, 42, Math.PI * 1.15, Math.PI * 1.5, false);
    g.strokePath();
  });

  mk(scene, "fx-glow", 56, 56, (g) => {
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(28, 28, 27);
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(28, 28, 18);
  });

  mk(scene, "fx-lane-glow", Math.round(LANE_WIDTH) - 10, 240, (g) => {
    const w = Math.round(LANE_WIDTH) - 10;
    for (let i = 0; i < 4; i++) {
      g.fillStyle(P.green, 0.07 + i * 0.05);
      g.fillRoundedRect(i * 4, i * 10, w - i * 8, 240 - i * 20, 12);
    }
  });

  mk(scene, "fx-warn", 40, 40, (g) => {
    g.fillStyle(P.amber, 1);
    g.fillTriangle(20, 2, 2, 36, 38, 36);
    outlined(g);
    g.strokeTriangle(20, 2, 2, 36, 38, 36);
    g.fillStyle(INK, 1);
    g.fillRoundedRect(18, 12, 5, 13, 2);
    g.fillCircle(20.5, 30, 2.8);
  });

  // balloon cluster for the finish
  mk(scene, "fx-balloons", 60, 84, (g) => {
    const cols = [P.red, P.blue, P.green, P.amber];
    const pos = [
      [16, 18],
      [34, 10],
      [46, 26],
      [26, 32],
    ];
    g.lineStyle(1.5, INK, 0.8);
    pos.forEach(([x, y]) => g.lineBetween(x, y + 10, 30, 80));
    pos.forEach(([x, y], i) => {
      g.fillStyle(cols[i % cols.length], 1);
      g.fillEllipse(x, y, 20, 24);
      outlined(g, 1.5);
      g.strokeEllipse(x, y, 20, 24);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(x - 4, y - 5, 6, 8);
    });
  });

  mk(scene, "fx-cloud", 96, 44, (g) => {
    g.fillStyle(0xffffff, 0.92);
    g.fillCircle(24, 28, 15);
    g.fillCircle(46, 20, 19);
    g.fillCircle(70, 28, 14);
    g.fillRect(22, 26, 50, 16);
  });
}

/* ------------------------------------------------------------------ */

export function generateAllTextures(scene: Phaser.Scene): void {
  roadTile(scene, "road-day", P.asphalt, false);
  roadTile(scene, "road-wet", P.asphaltWet, true);
  flyoverTile(scene);

  texShuttle(scene);
  texDanfo(scene, "veh-danfo", false);
  texDanfo(scene, "obs-danfo", true);
  texBike(scene, "veh-bike", 0x2f6fdb, P.amber);
  texOkada(scene);
  texTruck(scene);
  texCarBroken(scene);

  texPothole(scene);
  texBarrier(scene);
  texSpinner(scene);
  texApiGate(scene);
  texFigmaLayers(scene);
  texBug(scene);
  texDeployZone(scene);

  texPickups(scene);
  texPowerups(scene);

  texBuildings(scene);
  texPalm(scene);
  texTree(scene);
  texVendor(scene);
  texBusStop(scene);
  texBillboard(scene);
  texStreetLight(scene);
  texCrowd(scene);
  texGate(scene);
  texBannerFlag(scene);
  texSkyline(scene);

  texFx(scene);
}
