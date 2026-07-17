/** Logical viewport. Scaled with FIT so mobile and desktop see the same road. */
export const GAME_WIDTH = 420;
export const GAME_HEIGHT = 760;

export const ROAD_WIDTH = 312;
export const ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2; // 54
export const LANE_COUNT = 3;
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT; // 104

/** x centre of a lane (0..2) */
export const laneX = (lane: number): number =>
  ROAD_LEFT + LANE_WIDTH * (lane + 0.5);

/** Player's fixed row near the lower third. */
export const PLAYER_Y = 640;

/** Where fresh objects enter and leave the world. */
export const SPAWN_Y = -150;
export const DESPAWN_Y = GAME_HEIGHT + 160;

/** Depth layers */
export const DEPTH = {
  road: 0,
  roadMarking: 1,
  roadside: 2,
  shadow: 3,
  pickup: 4,
  obstacle: 5,
  player: 6,
  overhead: 8, // banners, arches
  weather: 9,
  vignette: 10,
} as const;
