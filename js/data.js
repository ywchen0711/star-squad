// Star Squad: pilots, upgrades, shop, enemies and stage timelines. Pure data (no DOM) so tools/sim.mjs can run the game in Node.
export const W = 360, H = 640;            // playfield in game units (drawn at the screen's full resolution)

// ------------------------------------------------------------------ pilots (names / descriptions live in i18n.js)
export const PILOTS = [
  { id: 'josh', color: '#3a8aff', dark: '#1a3a8a', light: '#bfe0ff', weapon: 'spread', active: 'dash', passive: 'afterburner', speed: 1.0, hp: 5 },
  { id: 'jasper', color: '#2ec85a', dark: '#14602a', light: '#c4ffd4', weapon: 'homing', active: 'storm', passive: 'lucky', speed: 1.0, hp: 5 },
  { id: 'jeff', color: '#e8452c', dark: '#7a1a10', light: '#ffd0c0', weapon: 'laser', active: 'mirror', passive: 'armor', speed: 0.92, hp: 5 },
  { id: 'erin', color: '#a45ae8', dark: '#4a1a7a', light: '#ecd4ff', weapon: 'wave', active: 'warp', passive: 'phoenix', speed: 1.0, hp: 5 },
];
export const PILOT = Object.fromEntries(PILOTS.map((p) => [p.id, p]));

// ------------------------------------------------------------------ permanent upgrades (shared by the whole squad)
export const UPGRADES = [
  { id: 'dmg', icon: '💥', per: 0.12 },      // +12% damage per level
  { id: 'rate', icon: '⚡', per: 0.08 },     // +8% fire rate
  { id: 'hull', icon: '❤️', per: 1 },        // +1 max HP
  { id: 'engine', icon: '🚀', per: 0.06 },   // +6% speed
  { id: 'magnet', icon: '🧲', per: 0.3 },    // +30% pickup radius
  { id: 'charge', icon: '🔋', per: 0.15 },   // +15% skill charge
];
export const UP_COST = [60, 130, 240, 400, 620];
export const UP_MAX = UP_COST.length;

// ------------------------------------------------------------------ consumables (bought in the hangar, used up in the next mission)
export const ITEMS = [
  { id: 'bomb', icon: '💣', price: 50, max: 3 },        // screen-clearing Nova Bomb (B)
  { id: 'repair', icon: '🔧', price: 45, max: 1 },      // when down to 1 HP: +2 HP, once
  { id: 'shield', icon: '🛡️', price: 70, max: 1 },     // absorbs the first 3 hits
  { id: 'power', icon: '🔺', price: 60, max: 1 },       // start at weapon level 3
  { id: 'booster', icon: '🪙', price: 80, max: 1 },     // +50% credits this mission
  { id: 'charge', icon: '🌟', price: 35, max: 1 },      // start with a full skill meter
];

// ------------------------------------------------------------------ enemies (hp is multiplied by the stage's scale)
export const ENEMIES = {
  drone: { hp: 16, r: 9, coins: 1, energy: 2, score: 100 },
  dart: { hp: 12, r: 8, coins: 1, energy: 2, score: 120 },
  gunner: { hp: 50, r: 11, coins: 3, energy: 4, score: 300, drop: 0.12 },
  spinner: { hp: 80, r: 12, coins: 4, energy: 5, score: 400, drop: 0.12 },
  tank: { hp: 220, r: 16, coins: 8, energy: 8, score: 800, drop: 0.3 },
  mine: { hp: 30, r: 9, coins: 2, energy: 3, score: 150 },
  rock: { hp: 40, r: 14, coins: 2, energy: 2, score: 150 },
  pebble: { hp: 14, r: 8, coins: 1, energy: 1, score: 60 },
  elite: { hp: 1400, r: 22, coins: 40, energy: 30, score: 5000, drop: 1 },
  clone: { hp: 1e9, r: 18, coins: 0, energy: 0, score: 0 },        // the Phantom Queen's decoys
};

// ------------------------------------------------------------------ stages
// timeline entries: [time (s), formation, enemy, options]. 'boss' starts the boss once the screen is clear.
const S1 = [
  [1, 'line', 'drone', { n: 5 }], [4, 'column', 'dart', { x: 0.2, n: 5 }], [6, 'column', 'dart', { x: 0.8, n: 5 }],
  [9, 'rocks', 'rock', { n: 5 }], [13, 'drop', 'gunner', { xs: [0.25, 0.75] }], [16, 'v', 'drone', { n: 7 }],
  [20, 'sweep', 'dart', { side: 'L', n: 6 }], [23, 'sweep', 'dart', { side: 'R', n: 6 }], [26, 'rocks', 'rock', { n: 7 }],
  [30, 'drop', 'gunner', { xs: [0.2, 0.5, 0.8] }], [34, 'single', 'tank', { x: 0.5 }], [38, 'line', 'drone', { n: 6, sine: true }],
  [42, 'elite', 'elite', {}], [54, 'rocks', 'rock', { n: 8 }], [57, 'sweep', 'dart', { side: 'L', n: 8 }], [60, 'drop', 'spinner', { xs: [0.5] }],
  [64, 'v', 'drone', { n: 9 }], [68, 'column', 'dart', { x: 0.5, n: 8 }], [72, 'boss'],
];
const S2 = [
  [1, 'sweep', 'dart', { side: 'L', n: 6 }], [3, 'sweep', 'dart', { side: 'R', n: 6 }], [6, 'line', 'drone', { n: 6, sine: true }],
  [9, 'drop', 'spinner', { xs: [0.3, 0.7] }], [13, 'mines', 'mine', { n: 6 }], [16, 'drop', 'gunner', { xs: [0.15, 0.5, 0.85] }],
  [20, 'v', 'drone', { n: 9 }], [23, 'column', 'dart', { x: 0.15, n: 6 }], [24, 'column', 'dart', { x: 0.85, n: 6 }],
  [28, 'single', 'tank', { x: 0.3 }], [29, 'single', 'tank', { x: 0.7 }], [34, 'mines', 'mine', { n: 8 }],
  [38, 'drop', 'spinner', { xs: [0.2, 0.5, 0.8] }], [42, 'elite', 'elite', {}], [55, 'sweep', 'dart', { side: 'L', n: 8 }],
  [57, 'sweep', 'dart', { side: 'R', n: 8 }], [60, 'drop', 'gunner', { xs: [0.2, 0.4, 0.6, 0.8] }], [65, 'line', 'drone', { n: 8, sine: true }],
  [69, 'mines', 'mine', { n: 8 }], [74, 'boss'],
];
const S3 = [
  [1, 'rocks', 'rock', { n: 6 }], [4, 'v', 'drone', { n: 7 }], [7, 'drop', 'spinner', { xs: [0.25, 0.75] }],
  [11, 'sweep', 'dart', { side: 'L', n: 7 }], [13, 'sweep', 'dart', { side: 'R', n: 7 }], [16, 'rocks', 'rock', { n: 8 }],
  [20, 'drop', 'gunner', { xs: [0.15, 0.38, 0.62, 0.85] }], [24, 'single', 'tank', { x: 0.5 }], [27, 'mines', 'mine', { n: 6 }],
  [31, 'line', 'drone', { n: 8, sine: true }], [35, 'drop', 'spinner', { xs: [0.2, 0.5, 0.8] }], [40, 'elite', 'elite', {}],
  [53, 'rocks', 'rock', { n: 9 }], [56, 'column', 'dart', { x: 0.3, n: 8 }], [57, 'column', 'dart', { x: 0.7, n: 8 }],
  [61, 'single', 'tank', { x: 0.25 }], [62, 'single', 'tank', { x: 0.75 }], [67, 'v', 'drone', { n: 11 }], [72, 'boss'],
];
const S4 = [
  [1, 'line', 'drone', { n: 7, sine: true }], [4, 'drop', 'gunner', { xs: [0.2, 0.5, 0.8] }], [8, 'sweep', 'dart', { side: 'L', n: 8 }],
  [10, 'sweep', 'dart', { side: 'R', n: 8 }], [13, 'single', 'tank', { x: 0.5 }], [17, 'mines', 'mine', { n: 8 }],
  [21, 'drop', 'spinner', { xs: [0.15, 0.5, 0.85] }], [25, 'v', 'drone', { n: 11 }], [29, 'single', 'tank', { x: 0.2 }],
  [30, 'single', 'tank', { x: 0.8 }], [34, 'column', 'dart', { x: 0.5, n: 10 }], [38, 'elite', 'elite', {}],
  [51, 'drop', 'gunner', { xs: [0.1, 0.3, 0.5, 0.7, 0.9] }], [55, 'mines', 'mine', { n: 10 }], [59, 'drop', 'spinner', { xs: [0.3, 0.7] }],
  [63, 'line', 'drone', { n: 9, sine: true }], [67, 'single', 'tank', { x: 0.5 }], [72, 'boss'],
];
const S5 = [
  [1, 'v', 'drone', { n: 11 }], [4, 'sweep', 'dart', { side: 'L', n: 9 }], [6, 'sweep', 'dart', { side: 'R', n: 9 }],
  [9, 'drop', 'spinner', { xs: [0.2, 0.5, 0.8] }], [13, 'single', 'tank', { x: 0.3 }], [14, 'single', 'tank', { x: 0.7 }],
  [18, 'mines', 'mine', { n: 10 }], [22, 'drop', 'gunner', { xs: [0.1, 0.3, 0.5, 0.7, 0.9] }], [26, 'line', 'drone', { n: 9, sine: true }],
  [30, 'elite', 'elite', {}], [43, 'column', 'dart', { x: 0.2, n: 10 }], [44, 'column', 'dart', { x: 0.8, n: 10 }],
  [48, 'drop', 'spinner', { xs: [0.15, 0.5, 0.85] }], [52, 'single', 'tank', { x: 0.5 }], [56, 'mines', 'mine', { n: 12 }],
  [60, 'elite', 'elite', {}], [72, 'boss'],
];

export const STAGES = [
  { id: 1, boss: 'goliath', bossHp: 9000, scale: 1, shot: 1, timeline: S1, bg: 'asteroids', pal: { a: '#9a7a5a', b: '#5a4a3a', glow: '#ffb05a', sky: ['#0a0a1a', '#1a1428'] } },
  { id: 2, boss: 'queen', bossHp: 14000, scale: 1.35, shot: 1.08, timeline: S2, bg: 'neon', pal: { a: '#ff4ab0', b: '#3a1a5a', glow: '#4af0ff', sky: ['#120022', '#2a0a3a'] } },
  { id: 3, boss: 'hydra', bossHp: 19000, scale: 1.8, shot: 1.15, timeline: S3, bg: 'crystal', pal: { a: '#6ae8ff', b: '#1a4a6a', glow: '#c8a0ff', sky: ['#020a1e', '#0a2440'] } },
  { id: 4, boss: 'titan', bossHp: 23000, scale: 2.3, shot: 1.22, timeline: S4, bg: 'forge', pal: { a: '#ff7a2a', b: '#5a1a0a', glow: '#ffe04a', sky: ['#1a0600', '#3a1004'] } },
  { id: 5, boss: 'destroyer', bossHp: 30000, scale: 2.9, shot: 1.3, timeline: S5, bg: 'core', pal: { a: '#8a94a8', b: '#2a2e3a', glow: '#ff3a4a', sky: ['#05060a', '#14161e'] } },
];

export const CLEAR_BONUS = (stage) => 80 + 40 * stage;
export const NOHIT_BONUS = 100;
