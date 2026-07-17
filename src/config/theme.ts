/**
 * Design tokens derived from the live devfestlagos.com visual audit.
 * Single source of truth for both the React interface and the Phaser game.
 */
export const palette = {
  ink: "#1e1e1e",
  paper: "#f0f0f0",
  white: "#ffffff",

  // Google core (used sparingly, as on the site)
  red: "#ea4335",
  blue: "#4285f4",
  green: "#34a853",
  amber: "#f9ab00",

  // DevFest pastels (cards, chips)
  pastelYellow: "#ffe7a5",
  pastelBlue: "#c3ecf6",
  pastelGreen: "#ccf6c5",
  pastelPink: "#f8d8d8",
} as const;

/** Phaser wants numeric colours. */
export const hex = (c: string): number => parseInt(c.replace("#", ""), 16);

export const gamePalette = {
  ink: hex(palette.ink),
  paper: hex(palette.paper),
  white: hex(palette.white),
  red: hex(palette.red),
  blue: hex(palette.blue),
  green: hex(palette.green),
  amber: hex(palette.amber),
  pastelYellow: hex(palette.pastelYellow),
  pastelBlue: hex(palette.pastelBlue),
  pastelGreen: hex(palette.pastelGreen),
  pastelPink: hex(palette.pastelPink),
  // Game-world extensions (kept in the same flat, outlined style)
  asphalt: 0x3a3a3f,
  asphaltWet: 0x2e2e36,
  laneLine: 0xe8e4da,
  kerb: 0xc9c4b8,
  dirt: 0xd9cfae,
  leaf: 0x4c9e58,
  leafDark: 0x357540,
} as const;
