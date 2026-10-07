// Tunable numbers live here (prices and catalog data live in src/data/*.json).
export const TITLE = 'Casa Brasil';
export const SAVE_KEY = 'jogocasa.save.v2';
export const SAVE_KEY_V1 = 'jogocasa.save.v1';

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

// Real visits (bloco D)
export const VISIT_RADIUS_M = 200;
export const BOOST_MULTIPLIER = 2;
export const BOOST_DAYS = 7;
export const PHOTO_MAX_SIDE = 960;
export const PHOTO_QUALITY = 0.8;
export const DEMO_RIBBON_KEY = 'ribbon_demo';

// Family club (bloco E)
export const MISSIONS_PER_WEEK = 3;
export const FAMILY_BADGE_PROFILES = 3;
export const FAMILY_BADGE_OUTINGS = 3;
export const DEFAULT_OUTING_TIME = '10:00';

// Parent panel (bloco F)
export const PIN_LENGTH = 4;
export const DEFAULT_DAILY_MINUTES = 60;
export const MAX_PROFILES = 4;
export const USAGE_TICK_MS = 15_000;

// Event QR (bloco H). The secret is public in the bundle: real validation would live on a server.
export const EVENT_NAME = 'Hackathon 2026';
export const EVENT_SECRET = 'casa-brasil-demo-2026';
export const EVENT_TROPHY_TEXT = 'Troféu Coruja, Edição Hackathon 2026';
export const QR_BASE_URL = '';
