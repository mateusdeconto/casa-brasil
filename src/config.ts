// Tunable numbers live here (prices and catalog data live in src/data/*.json).
export const TITLE = 'Casa Brasil';
export const SAVE_KEY = 'jogocasa.save.v1';

export const START_COINS = 200;
export const SELL_RATIO = 0.5;
export const NAME_MAX = 12;
export const DEFAULT_AVATAR = 'avatar_1';
export const AVATAR_IDS = Array.from({ length: 8 }, (_, i) => `avatar_${i + 1}`);

// Avatar standing height, in widths of one floor cell.
export const AVATAR_HEIGHT_CELLS = 1.6;
export const WALK_MS_PER_CELL = 280;

// Production
export const MAX_CYCLES = 10;
export const OFFLINE_CAP_HOURS = 8;
export const AWAY_SLEEP_MS = 20_000;

// UI layout (CSS px) reserved over the canvas
export const HUD_HEIGHT = 64;
export const NAV_HEIGHT = 84;

export const COLORS = {
  page: 0x1c1730,
  valid: 0x5fd35f,
  invalid: 0xe0484d,
  ghostAlpha: 0.6,
};
