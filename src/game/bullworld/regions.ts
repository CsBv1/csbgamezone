/**
 * Bull World — World & Region definitions
 * ---------------------------------------
 * The world is one seamless canvas. Regions are simply rectangles on that
 * canvas, so travel between them never triggers a load screen.
 *
 * To add a new region: append an entry to REGIONS with a free grid slot.
 * Grid is GRID_COLS x GRID_ROWS cells of REGION_SIZE px.
 */

export const REGION_SIZE = 4000;
export const GRID_COLS = 5;
export const GRID_ROWS = 3;
export const WORLD_WIDTH = REGION_SIZE * GRID_COLS; // 20000
export const WORLD_HEIGHT = REGION_SIZE * GRID_ROWS; // 12000

export type Weather = "clear" | "rain" | "snow" | "ash" | "sand" | "fog";

export interface Region {
  id: string;
  name: string;
  emoji: string;
  col: number;
  row: number;
  /** base ground colour */
  ground: string;
  /** secondary detail colour used for props / grid */
  accent: string;
  /** ambient sky tint drawn over the region */
  tint: string;
  levelRange: [number, number];
  weather: Weather;
  enemies: string[];
  /** optional mini-game portal anchored in this region */
  portal?: { name: string; route: string; emoji: string; holdersOnly?: boolean };
  /** safe zones have no hostile spawns */
  safe?: boolean;
  description: string;
}

export const REGIONS: Region[] = [
  {
    id: "bull-city", name: "Bull City", emoji: "🏙️", col: 2, row: 1,
    ground: "#1d2a44", accent: "#00d4ff", tint: "rgba(0,120,255,0.05)",
    levelRange: [1, 5], weather: "clear", enemies: [], safe: true,
    portal: { name: "Bull City", route: "/games/bull-city", emoji: "🏙️" },
    description: "Main spawn. Neon skyline, safe streets, all roads start here.",
  },
  {
    id: "green-meadows", name: "Green Meadows", emoji: "🌾", col: 1, row: 1,
    ground: "#1f3d1f", accent: "#5ce65c", tint: "rgba(60,200,80,0.06)",
    levelRange: [1, 8], weather: "clear", enemies: ["meadow-wolf", "wild-calf"],
    portal: { name: "Bull Sprint", route: "/games/bull-sprint", emoji: "⚡" },
    description: "Rolling grassland. Where every bull learns to fight.",
  },
  {
    id: "crystal-forest", name: "Crystal Forest", emoji: "🌲", col: 1, row: 0,
    ground: "#152b33", accent: "#7df9ff", tint: "rgba(0,200,220,0.08)",
    levelRange: [5, 14], weather: "fog", enemies: ["shard-sprite", "forest-stalker"],
    description: "Glowing crystal trees hum with raw magic.",
  },
  {
    id: "lava-mountains", name: "Lava Mountains", emoji: "🌋", col: 4, row: 0,
    ground: "#3a1410", accent: "#ff6a2b", tint: "rgba(255,80,0,0.10)",
    levelRange: [18, 30], weather: "ash", enemies: ["magma-hound", "ember-golem"],
    description: "Molten peaks. Bring fire resistance and courage.",
  },
  {
    id: "frozen-valley", name: "Frozen Valley", emoji: "❄️", col: 0, row: 0,
    ground: "#1b2c3d", accent: "#bfe9ff", tint: "rgba(180,230,255,0.10)",
    levelRange: [12, 22], weather: "snow", enemies: ["frost-wolf", "ice-revenant"],
    description: "Endless white. The cold drains energy faster.",
  },
  {
    id: "ancient-ruins", name: "Ancient Ruins", emoji: "🏛️", col: 3, row: 0,
    ground: "#2b2a22", accent: "#d9c37a", tint: "rgba(200,180,110,0.06)",
    levelRange: [15, 26], weather: "fog", enemies: ["ruin-guardian", "cursed-priest"],
    description: "The first bulls carved these stones. Something still guards them.",
  },
  {
    id: "desert-kingdom", name: "Desert Kingdom", emoji: "🏜️", col: 3, row: 1,
    ground: "#3d3218", accent: "#e8c96a", tint: "rgba(230,200,110,0.08)",
    levelRange: [10, 20], weather: "sand", enemies: ["sand-raider", "dune-scorpion"],
    portal: { name: "Obstacle Rush", route: "/games/obstacle-rush", emoji: "🚧" },
    description: "Golden dunes hiding a buried dynasty.",
  },
  {
    id: "pirate-coast", name: "Pirate Coast", emoji: "🏴‍☠️", col: 0, row: 1,
    ground: "#122b38", accent: "#4fd1c5", tint: "rgba(0,180,190,0.08)",
    levelRange: [8, 18], weather: "rain", enemies: ["corsair-bull", "reef-crab"],
    portal: { name: "Bull Relay", route: "/games/bull-relay", emoji: "🔄" },
    description: "Salt, storms and stolen treasure.",
  },
  {
    id: "mystic-swamp", name: "Mystic Swamp", emoji: "🐊", col: 0, row: 2,
    ground: "#1c2a1c", accent: "#9be36b", tint: "rgba(120,200,90,0.08)",
    levelRange: [14, 24], weather: "fog", enemies: ["bog-lurker", "witch-toad"],
    description: "Poison mist and whispers from the water.",
  },
  {
    id: "sky-islands", name: "Sky Islands", emoji: "☁️", col: 2, row: 0,
    ground: "#1a2340", accent: "#a9c8ff", tint: "rgba(140,180,255,0.10)",
    levelRange: [22, 35], weather: "clear", enemies: ["storm-harpy", "cloud-titan"],
    description: "Floating rock above the clouds. Only the strongest climb.",
  },
  {
    id: "arena-district", name: "Arena District", emoji: "⚔️", col: 3, row: 2,
    ground: "#2e1620", accent: "#ff4d6d", tint: "rgba(255,70,100,0.07)",
    levelRange: [1, 40], weather: "clear", enemies: ["arena-champion"],
    portal: { name: "Bull Arena", route: "/games/bull-arena", emoji: "⚔️" },
    description: "PvP duels, tournaments and roaring crowds.",
  },
  {
    id: "community-hub", name: "Community Hub", emoji: "🤝", col: 1, row: 2,
    ground: "#232244", accent: "#c084fc", tint: "rgba(160,110,255,0.07)",
    levelRange: [1, 5], weather: "clear", enemies: [], safe: true,
    portal: { name: "Holders Arena", route: "/games/holders-arena", emoji: "👑", holdersOnly: true },
    description: "Guild boards, events and the holder lounge.",
  },
  {
    id: "marketplace", name: "Marketplace", emoji: "🛒", col: 2, row: 2,
    ground: "#2a2338", accent: "#ffd166", tint: "rgba(255,200,90,0.07)",
    levelRange: [1, 5], weather: "clear", enemies: [], safe: true,
    portal: { name: "Bull Maze", route: "/games/bull-stampede", emoji: "🏃" },
    description: "Trade, auction and player shops.",
  },
  {
    id: "dungeon-entrance", name: "Dungeon Entrance", emoji: "🕳️", col: 4, row: 1,
    ground: "#171722", accent: "#8b5cf6", tint: "rgba(90,60,160,0.12)",
    levelRange: [25, 40], weather: "fog", enemies: ["shade-bull", "abyss-warden"],
    description: "The dark gate. Raids and deep runs begin here.",
  },
  {
    id: "frontier", name: "Frontier (Expansion)", emoji: "🧭", col: 4, row: 2,
    ground: "#20242b", accent: "#94a3b8", tint: "rgba(150,170,200,0.05)",
    levelRange: [1, 60], weather: "clear", enemies: ["wild-calf"],
    description: "Unclaimed land reserved for future regions and seasons.",
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export function regionBounds(r: Region) {
  return {
    x: r.col * REGION_SIZE,
    y: r.row * REGION_SIZE,
    w: REGION_SIZE,
    h: REGION_SIZE,
    cx: r.col * REGION_SIZE + REGION_SIZE / 2,
    cy: r.row * REGION_SIZE + REGION_SIZE / 2,
  };
}

export function regionAt(x: number, y: number): Region {
  const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(x / REGION_SIZE)));
  const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / REGION_SIZE)));
  return REGIONS.find((r) => r.col === col && r.row === row) || REGIONS[0];
}

export const SPAWN = (() => {
  const b = regionBounds(REGION_BY_ID["bull-city"]);
  return { x: b.cx, y: b.cy };
})();

/** Fast-travel waypoints — one per region centre, unlocked once discovered. */
export const WAYPOINTS = REGIONS.map((r) => ({
  regionId: r.id,
  name: r.name,
  emoji: r.emoji,
  ...regionBounds(r),
}));
