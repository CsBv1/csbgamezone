import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Swords, Heart, Sparkles, Skull, Shield, Zap, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";

/* ============================ RANCH DATA ==============================
   A fictional, community-made Cardano ranch world. Not affiliated with,
   endorsed by, or representing any real person or organisation.
======================================================================= */

const TILE = 48;
const MAP_W = 72;
const MAP_H = 72;

type Palette = { id: string; name: string; emoji: string; floor: string; floor2: string; wall: string; wallTop: string; glow: string; fog: string };

const RANCH_PALETTE: Palette = {
  id: "ranch", name: "Hoskinson Ranch", emoji: "🌾",
  floor: "#1b2a1c", floor2: "#213322", wall: "#0d1410", wallTop: "#3f6b3d", glow: "#7ee081", fog: "rgba(4,12,8,0.86)",
};

const DUNGEON_PALETTES: Palette[] = [
  { id: "vault", name: "Research Vault", emoji: "🗄️", floor: "#151d2b", floor2: "#1c2537", wall: "#080d15", wallTop: "#31456b", glow: "#00d4ff", fog: "rgba(3,7,14,0.90)" },
  { id: "archive", name: "Ouroboros Archive", emoji: "🌀", floor: "#1d1830", floor2: "#26203f", wall: "#0f0c1c", wallTop: "#4b3a78", glow: "#c084fc", fog: "rgba(8,4,18,0.90)" },
  { id: "core", name: "Chaos Core", emoji: "⚙️", floor: "#2a1a12", floor2: "#341f16", wall: "#140a06", wallTop: "#7a4423", glow: "#ff8a3d", fog: "rgba(16,6,2,0.91)" },
];

type EnemyDef = { id: string; name: string; emoji: string; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string; radius: number; ranged?: boolean };

const ENEMIES: EnemyDef[] = [
  { id: "field-pest", name: "Field Pest", emoji: "🐗", hp: 30, dmg: 5, speed: 1.6, xp: 11, rune: 3, color: "#c2a25a", radius: 16 },
  { id: "fork-wolf", name: "Hard Fork Wolf", emoji: "🐺", hp: 58, dmg: 11, speed: 1.75, xp: 22, rune: 8, color: "#9fb6c9", radius: 18 },
  { id: "fud-spirit", name: "FUD Spirit", emoji: "👻", hp: 48, dmg: 10, speed: 1.4, xp: 20, rune: 7, color: "#a78bfa", radius: 17, ranged: true },
  { id: "rogue-node", name: "Rogue Node", emoji: "🛰️", hp: 76, dmg: 13, speed: 1.2, xp: 30, rune: 11, color: "#38bdf8", radius: 19, ranged: true },
  { id: "mine-golem", name: "Ore Golem", emoji: "🗿", hp: 140, dmg: 18, speed: 0.85, xp: 46, rune: 17, color: "#8d8577", radius: 24 },
  { id: "peak-yeti", name: "Peak Stalker", emoji: "🦣", hp: 110, dmg: 17, speed: 1.5, xp: 40, rune: 15, color: "#bae6fd", radius: 22 },
  { id: "chaos-drone", name: "Chaos Drone", emoji: "🤖", hp: 90, dmg: 16, speed: 1.9, xp: 38, rune: 14, color: "#ff8a3d", radius: 19 },
];

type BossDef = { id: string; name: string; emoji: string; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string };

const GUARDIAN: BossDef = { id: "stake-guardian", name: "Staking Guardian", emoji: "🛡️", hp: 900, dmg: 24, speed: 1.1, xp: 320, rune: 150, color: "#38bdf8" };

const DUNGEON_BOSSES: BossDef[] = [
  { id: "vault-warden", name: "Vault Warden", emoji: "🔐", hp: 1200, dmg: 28, speed: 1.1, xp: 420, rune: 200, color: "#00d4ff" },
  { id: "archivist", name: "The Archivist", emoji: "📜", hp: 1600, dmg: 33, speed: 1.15, xp: 560, rune: 270, color: "#c084fc" },
  { id: "chaos-engine", name: "THE CHAOS ENGINE", emoji: "⚙️", hp: 2600, dmg: 42, speed: 1.2, xp: 1100, rune: 600, color: "#ff8a3d" },
];

const RARITY_MULT: Record<string, number> = { common: 1, rare: 1.15, epic: 1.3, legendary: 1.5 };

export function expForLevel(level: number) {
  return 80 + level * 40;
}

/* ------------------------------- ranch areas ---------------------------- */

type AreaKind = "house" | "pasture" | "fields" | "mining" | "lab" | "barn" | "stable" | "arena" | "wilds" | "mountain" | "portal";
type Area = { id: AreaKind; name: string; emoji: string; tx: number; ty: number; color: string; blurb: string };

const AREAS: Area[] = [
  { id: "house", name: "Ranch House", emoji: "🏡", tx: 36, ty: 36, color: "#facc15", blurb: "Central hub. Rest, bank rewards and enter the Ranch Dungeon." },
  { id: "pasture", name: "Bull Pastures", emoji: "🐂", tx: 22, ty: 28, color: "#7ee081", blurb: "Open grazing land — free exploration and easy foes." },
  { id: "fields", name: "Cardano Fields", emoji: "🌽", tx: 50, ty: 26, color: "#a3e635", blurb: "Harvest epoch grain for Rune Power." },
  { id: "mining", name: "Mining Valley", emoji: "⛏️", tx: 14, ty: 50, color: "#f59e0b", blurb: "Swing the pick for ore and Rune Power." },
  { id: "lab", name: "Research Lab", emoji: "🧪", tx: 56, ty: 48, color: "#00d4ff", blurb: "Peer-reviewed research notes are stored here." },
  { id: "barn", name: "Education Barn", emoji: "📚", tx: 30, ty: 52, color: "#c084fc", blurb: "Cardano lore: eras, epochs, and the research-first idea." },
  { id: "stable", name: "Stable", emoji: "🐴", tx: 44, ty: 44, color: "#fb923c", blurb: "Saddle a companion for a lasting speed boost." },
  { id: "arena", name: "Ranch Arena", emoji: "🏆", tx: 20, ty: 40, color: "#ff4d6d", blurb: "Bull combat trials — a Staking Guardian waits." },
  { id: "wilds", name: "Wilderness", emoji: "🌲", tx: 58, ty: 62, color: "#22c55e", blurb: "Untamed woods, tougher monsters, better EXP." },
  { id: "mountain", name: "Mountain Expedition", emoji: "🏔️", tx: 12, ty: 14, color: "#bae6fd", blurb: "The hardest open zone on the ranch." },
  { id: "portal", name: "Cardano Portal", emoji: "🚪", tx: 62, ty: 12, color: "#e879f9", blurb: "A gateway to the other Game Zone worlds." },
];

/* --------------------------------- quests -------------------------------- */

type QuestId = "build-future" | "proof-of-stake" | "decentralization";
type Quest = { id: QuestId; title: string; emoji: string; goal: number; desc: string; reward: number; lore: string };

const QUESTS: Quest[] = [
  { id: "build-future", title: "Build the Future", emoji: "📝", goal: 5, reward: 250,
    desc: "Collect 5 research notes scattered across the Ranch.",
    lore: "Cardano is built research-first: ideas are peer-reviewed before they ship." },
  { id: "proof-of-stake", title: "Proof of Stake", emoji: "🛡️", goal: 3, reward: 400,
    desc: "Defeat 3 Staking Guardians and recover the lost Stake Keys.",
    lore: "Ouroboros secures the chain with stake instead of raw energy — delegators keep custody of their ADA." },
  { id: "decentralization", title: "Decentralization", emoji: "🛰️", goal: 3, reward: 500,
    desc: "Activate three independent nodes around the Ranch.",
    lore: "Thousands of independent stake pools — no single operator controls the network." },
];

const LORE: string[] = [
  "IOG's research-first method: papers first, code second.",
  "Ouroboros was the first provably secure proof-of-stake protocol.",
  "Eras are named after thinkers: Byron, Shelley, Goguen, Basho, Voltaire.",
  "Shelley moved the network toward community-run stake pools.",
  "Voltaire brought on-chain governance and a treasury voted on by the community.",
  "An epoch lasts 5 days; rewards are paid out epoch by epoch.",
  "eUTXO makes transaction outcomes predictable before you submit them.",
  "Delegating never locks your ADA — it stays in your own wallet.",
  "Hydra explores scaling by moving work into off-chain heads.",
  "Mithril speeds up node bootstrapping with certified snapshots.",
];

const TITLES: { title: string; need: () => boolean }[] = [];

/* ============================ MAP GENERATION ============================ */

type Rect = { x: number; y: number; w: number; h: number };

/** Open-air ranch: mostly walkable with fences, groves and rock clusters. */
function genRanch() {
  const grid: number[] = new Array(MAP_W * MAP_H).fill(0);
  for (let i = 0; i < MAP_W; i++) { grid[i] = 1; grid[(MAP_H - 1) * MAP_W + i] = 1; }
  for (let j = 0; j < MAP_H; j++) { grid[j * MAP_W] = 1; grid[j * MAP_W + MAP_W - 1] = 1; }
  // scattered clusters (groves / rocks / fence lines)
  for (let c = 0; c < 190; c++) {
    const x = 2 + Math.floor(Math.random() * (MAP_W - 5));
    const y = 2 + Math.floor(Math.random() * (MAP_H - 5));
    if (AREAS.some((a) => Math.hypot(a.tx - x, a.ty - y) < 7)) continue;
    const w = 1 + Math.floor(Math.random() * 3);
    const h = 1 + Math.floor(Math.random() * 3);
    for (let j = y; j < y + h && j < MAP_H - 1; j++)
      for (let i = x; i < x + w && i < MAP_W - 1; i++) grid[j * MAP_W + i] = 1;
  }
  const rooms: Rect[] = AREAS.map((a) => ({ x: a.tx - 3, y: a.ty - 3, w: 6, h: 6 }));
  rooms.forEach((r) => {
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++)
      if (i > 0 && j > 0 && i < MAP_W - 1 && j < MAP_H - 1) grid[j * MAP_W + i] = 0;
  });
  return { grid, rooms };
}

function genDungeon(floor: number) {
  const grid: number[] = new Array(MAP_W * MAP_H).fill(1);
  const rooms: Rect[] = [];
  const target = 9 + Math.min(6, floor);
  let guard = 0;
  while (rooms.length < target && guard++ < 600) {
    const w = 5 + Math.floor(Math.random() * 8);
    const h = 5 + Math.floor(Math.random() * 8);
    const x = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
    const y = 1 + Math.floor(Math.random() * (MAP_H - h - 2));
    const r = { x, y, w, h };
    if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
    rooms.push(r);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * MAP_W + i] = 0;
  }
  const carveH = (x1: number, x2: number, y: number) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { grid[y * MAP_W + x] = 0; grid[(y + 1) * MAP_W + x] = 0; }
  };
  const carveV = (y1: number, y2: number, x: number) => {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { grid[y * MAP_W + x] = 0; grid[y * MAP_W + x + 1] = 0; }
  };
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
    if (Math.random() < 0.5) { carveH(ax, bx, ay); carveV(ay, by, bx); }
    else { carveV(ay, by, ax); carveH(ax, bx, by); }
  }
  return { grid, rooms };
}

const cx = (r: Rect) => (r.x + r.w / 2) * TILE;
const cy = (r: Rect) => (r.y + r.h / 2) * TILE;

/* =============================== ENTITIES =============================== */

interface Mob { id: number; x: number; y: number; hp: number; maxHp: number; def: EnemyDef | BossDef; boss: boolean; guardian?: boolean; cd: number; hit: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; friendly: boolean; color: string }
interface Pickup { x: number; y: number; kind: "potion" | "chest" | "rune" | "note" | "node"; taken: boolean }
interface Fx { x: number; y: number; life: number; max: number; text?: string; color: string; r?: number }

export default function CsbRanch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId } = useCsbv1();
  const heldBulls = useHeldCsbBulls(userId, walletNfts as any);

  const [phase, setPhase] = useState<"select" | "playing" | "dead" | "cleared">("select");
  const [bull, setBull] = useState<HeldCsbBull | null>(null);
  const [mode, setMode] = useState<"ranch" | "dungeon">("ranch");
  const [depth, setDepth] = useState(0);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, exp: 0, need: 120, kills: 0, rune: 0, xp: 0, bossHp: 0, bossMax: 0, bossName: "", area: "Ranch House" });
  const [quests, setQuests] = useState({ notes: 0, guardians: 0, nodes: 0 });
  const [loreOpen, setLoreOpen] = useState<{ title: string; body: string } | null>(null);
  const [runSummary, setRunSummary] = useState({ rune: 0, xp: 0, kills: 0, floors: 0, levels: 0, title: "" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bullImgRef = useRef<HTMLImageElement | null>(null);

  const g = useRef({
    grid: [] as number[], rooms: [] as Rect[], palette: RANCH_PALETTE, mode: "ranch" as "ranch" | "dungeon", depth: 0,
    px: 0, py: 0, facing: 1, dashCd: 0, slamCd: 0, invul: 0, speedMult: 1,
    hp: 100, maxHp: 100, atk: 12, def: 2, atkCd: 0,
    level: 1, exp: 0, gainedXp: 0, gainedRune: 0, bankedXp: 0, bankedRune: 0, kills: 0, levelUps: 0,
    mobs: [] as Mob[], shots: [] as Shot[], pickups: [] as Pickup[], fx: [] as Fx[],
    respawns: [] as { t: number; def: EnemyDef; x: number; y: number; scale: number }[],
    nextId: 100000,
    explored: new Uint8Array(MAP_W * MAP_H),
    keys: {} as Record<string, boolean>, joy: { active: false, dx: 0, dy: 0 },
    exit: { x: 0, y: 0 }, bossAlive: false, running: false, t: 0, camX: 0, camY: 0,
    attackReq: false, dashReq: false, slamReq: false,
    notes: 0, guardians: 0, nodes: 0, cooldowns: {} as Record<string, number>, mounted: false,
    nearArea: null as Area | null,
  });

  useEffect(() => {
    if (!bull?.image) { bullImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bull.image;
    img.onload = () => { bullImgRef.current = img; };
  }, [bull?.image]);

  const walkable = (x: number, y: number) => {
    const i = Math.floor(x / TILE), j = Math.floor(y / TILE);
    if (i < 0 || j < 0 || i >= MAP_W || j >= MAP_H) return false;
    return g.current.grid[j * MAP_W + i] === 0;
  };

  const pushFx = (x: number, y: number, color: string, text?: string, r?: number) => {
    g.current.fx.push({ x, y, life: 640, max: 640, color, text, r });
  };

  const titleFor = (s: typeof g.current) => {
    if (s.depth >= 3) return "🏷️ Ranch Legend";
    if (s.nodes >= 3) return "🏷️ Decentralized Ranger";
    if (s.guardians >= 3) return "🏷️ Staking Farmer";
    if (s.notes >= 5) return "🏷️ Blockchain Builder";
    return "🏷️ Cardano Pioneer";
  };

  /* ----------------------------- world build ---------------------------- */
  const buildRanch = useCallback(() => {
    const s = g.current;
    const { grid, rooms } = genRanch();
    s.grid = grid; s.rooms = rooms; s.mode = "ranch"; s.depth = 0; s.palette = RANCH_PALETTE;
    s.explored = new Uint8Array(MAP_W * MAP_H);
    s.mobs = []; s.shots = []; s.pickups = []; s.fx = []; s.respawns = [];
    const home = AREAS[0];
    s.px = home.tx * TILE; s.py = (home.ty + 2) * TILE;
    s.exit = { x: home.tx * TILE, y: home.ty * TILE };

    let id = 1;
    const lvlScale = 1 + (s.level - 1) * 0.08;
    // ambient monsters across the ranch, harder near wilds / mountain
    for (let k = 0; k < 90; k++) {
      const x = (3 + Math.random() * (MAP_W - 6)) * TILE;
      const y = (3 + Math.random() * (MAP_H - 6)) * TILE;
      if (!walkableGrid(grid, x, y)) continue;
      if (Math.hypot(x - s.px, y - s.py) < 400) continue;
      const wilds = AREAS.find((a) => a.id === "wilds")!, mtn = AREAS.find((a) => a.id === "mountain")!;
      const hard = Math.hypot(x / TILE - wilds.tx, y / TILE - wilds.ty) < 16 || Math.hypot(x / TILE - mtn.tx, y / TILE - mtn.ty) < 16;
      const pool = hard ? ENEMIES.slice(3) : ENEMIES.slice(0, 4);
      const def = pool[Math.floor(Math.random() * pool.length)];
      const scale = lvlScale * (hard ? 1.6 : 1);
      s.mobs.push({ id: id++, x, y, hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), def, boss: false, cd: 0, hit: 0 });
    }
    // 5 research notes near thematic areas
    const noteSpots: AreaKind[] = ["lab", "barn", "fields", "mountain", "wilds"];
    noteSpots.forEach((k, i) => {
      const a = AREAS.find((x) => x.id === k)!;
      s.pickups.push({ x: (a.tx + (i % 2 ? 2 : -2)) * TILE, y: (a.ty + 2) * TILE, kind: "note", taken: false });
    });
    // 3 nodes to activate
    (["pasture", "mining", "portal"] as AreaKind[]).forEach((k) => {
      const a = AREAS.find((x) => x.id === k)!;
      s.pickups.push({ x: (a.tx + 2) * TILE, y: (a.ty - 2) * TILE, kind: "node", taken: false });
    });
    // supplies
    for (let k = 0; k < 14; k++) {
      const a = AREAS[Math.floor(Math.random() * AREAS.length)];
      s.pickups.push({ x: (a.tx + (Math.random() * 4 - 2)) * TILE, y: (a.ty + (Math.random() * 4 - 2)) * TILE, kind: Math.random() < 0.5 ? "potion" : "chest", taken: false });
    }
    s.bossAlive = false;
  }, []);

  const walkableGrid = (grid: number[], x: number, y: number) => {
    const i = Math.floor(x / TILE), j = Math.floor(y / TILE);
    if (i < 0 || j < 0 || i >= MAP_W || j >= MAP_H) return false;
    return grid[j * MAP_W + i] === 0;
  };

  const buildDungeon = useCallback((d: number) => {
    const s = g.current;
    const { grid, rooms } = genDungeon(d);
    s.grid = grid; s.rooms = rooms; s.mode = "dungeon"; s.depth = d;
    s.palette = DUNGEON_PALETTES[Math.min(DUNGEON_PALETTES.length - 1, d - 1)];
    s.explored = new Uint8Array(MAP_W * MAP_H);
    s.mobs = []; s.shots = []; s.pickups = []; s.fx = []; s.respawns = [];
    s.px = cx(rooms[0]); s.py = cy(rooms[0]);
    let best = rooms[rooms.length - 1], bestD = -1;
    rooms.forEach((r, i) => {
      if (i === 0) return;
      const d2 = Math.hypot(cx(r) - s.px, cy(r) - s.py);
      if (d2 > bestD) { bestD = d2; best = r; }
    });
    s.exit = { x: cx(best), y: cy(best) };

    let id = 1;
    const scale = (1 + (s.level - 1) * 0.08) * (1 + (d - 1) * 0.35);
    rooms.forEach((r, ri) => {
      if (ri === 0) return;
      const count = 3 + Math.floor(Math.random() * 3) + d;
      for (let k = 0; k < count; k++) {
        const def = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
        s.mobs.push({
          id: id++, x: (r.x + 1 + Math.random() * (r.w - 2)) * TILE, y: (r.y + 1 + Math.random() * (r.h - 2)) * TILE,
          hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), def, boss: false, cd: 0, hit: 0,
        });
      }
      if (Math.random() < 0.55) s.pickups.push({ x: cx(r), y: cy(r), kind: Math.random() < 0.5 ? "potion" : "chest", taken: false });
    });

    const bd = DUNGEON_BOSSES[Math.min(DUNGEON_BOSSES.length - 1, d - 1)];
    const bscale = 1 + (s.level - 1) * 0.06;
    s.mobs.push({ id: id++, x: s.exit.x, y: s.exit.y, hp: Math.round(bd.hp * bscale), maxHp: Math.round(bd.hp * bscale), def: bd, boss: true, cd: 0, hit: 0 });
    s.bossAlive = true;
  }, []);

  /* ------------------------------ persistence --------------------------- */
  const persist = useCallback(async (finalRune: number, finalXp: number, newLevel: number, newExp: number) => {
    if (!userId || !bull) return;
    try {
      if (finalRune > 0) {
        const { data: row } = await supabase.from("csbv1_players" as any)
          .select("balance,total_earned").eq("user_id", userId).maybeSingle();
        if (row) {
          await supabase.from("csbv1_players" as any).update({
            balance: ((row as any).balance || 0) + finalRune,
            total_earned: ((row as any).total_earned || 0) + finalRune,
          }).eq("user_id", userId);
        } else {
          await supabase.from("csbv1_players" as any).insert({ user_id: userId, balance: finalRune, total_earned: finalRune });
        }
      }
      const { data: updated } = await supabase.from("csbv1_nft_power" as any)
        .update({ level: newLevel, exp: Math.round(newExp), updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("nft_id", bull.nft_id).select("id");
      if (!updated || updated.length === 0) {
        await supabase.from("csbv1_nft_power" as any).insert({
          user_id: userId, nft_id: bull.nft_id, nft_name: bull.nft_name,
          rarity: bull.rarity || "legendary", level: newLevel, exp: Math.round(newExp),
        });
      }
    } catch (e) { console.error("ranch persist failed", e); }
  }, [userId, bull]);

  const bankProgress = useCallback(async () => {
    const s = g.current;
    if (s.gainedRune <= 0 && s.gainedXp <= 0) return;
    const rune = s.gainedRune, xp = s.gainedXp;
    s.bankedRune += rune; s.bankedXp += xp;
    s.gainedRune = 0; s.gainedXp = 0;
    await persist(rune, xp, s.level, s.exp);
  }, [persist]);

  const endRun = useCallback((died: boolean) => {
    const s = g.current;
    s.running = false;
    const rune = died ? Math.floor(s.gainedRune * 0.5) : s.gainedRune;
    const xp = died ? Math.floor(s.gainedXp * 0.5) : s.gainedXp;
    setRunSummary({ rune: rune + s.bankedRune, xp: xp + s.bankedXp, kills: s.kills, floors: s.depth, levels: s.levelUps, title: titleFor(s) });
    setPhase(died ? "dead" : "cleared");
    persist(rune, xp, s.level, s.exp);
    supabase.from("game_results").insert({
      user_id: userId!, game_name: "Charles Hoskinson Ranch", result: died ? "loss" : "win", diamonds_won: 0,
    } as any).then(() => {});
    toast({ title: died ? "☠️ Your Bull fell on the Ranch" : "🌾 Ranch run banked", description: `+${rune + s.bankedRune} Rune Power · +${xp + s.bankedXp} EXP` });
  }, [persist, toast, userId]);

  /* -------------------------------- start ------------------------------- */
  const startRun = (b: HeldCsbBull) => {
    const s = g.current;
    const rare = RARITY_MULT[b.rarity] || 1;
    s.level = b.level || 1;
    s.exp = (b as any).exp || 0;
    s.maxHp = Math.round((120 + s.level * 14) * rare);
    s.hp = s.maxHp;
    s.atk = Math.round((11 + s.level * 2.2) * rare);
    s.def = Math.round(1 + s.level * 0.55);
    s.gainedRune = 0; s.gainedXp = 0; s.bankedRune = 0; s.bankedRune = 0; s.bankedXp = 0;
    s.kills = 0; s.levelUps = 0; s.notes = 0; s.guardians = 0; s.nodes = 0;
    s.cooldowns = {}; s.mounted = false; s.speedMult = 1;
    s.dashCd = 0; s.slamCd = 0; s.invul = 0; s.atkCd = 0;
    setBull(b);
    setQuests({ notes: 0, guardians: 0, nodes: 0 });
    setMode("ranch"); setDepth(0);
    buildRanch();
    s.running = true;
    setPhase("playing");
  };

  /* ------------------------------ input --------------------------------- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      g.current.keys[e.key.toLowerCase()] = true;
      if (e.key === " ") { e.preventDefault(); g.current.attackReq = true; }
      if (e.key.toLowerCase() === "shift") g.current.dashReq = true;
      if (e.key.toLowerCase() === "q") g.current.slamReq = true;
      if (e.key.toLowerCase() === "e") tryInteract();
    };
    const up = (e: KeyboardEvent) => { g.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const nearestArea = () => {
    const s = g.current;
    let best: Area | null = null, bd = 1e9;
    AREAS.forEach((a) => {
      const d = Math.hypot(a.tx * TILE - s.px, a.ty * TILE - s.py);
      if (d < bd) { bd = d; best = a; }
    });
    return bd < 150 ? best : null;
  };

  const spawnGuardian = () => {
    const s = g.current;
    if (s.mobs.some((m) => m.guardian)) { toast({ title: "A Guardian is already on the field" }); return; }
    const scale = 1 + (s.level - 1) * 0.06;
    s.mobs.push({
      id: s.nextId++, x: s.px + 200, y: s.py, boss: true, guardian: true, cd: 0, hit: 0,
      hp: Math.round(GUARDIAN.hp * scale), maxHp: Math.round(GUARDIAN.hp * scale), def: GUARDIAN,
    });
    s.bossAlive = true;
    pushFx(s.px + 200, s.py, GUARDIAN.color, "GUARDIAN!", 140);
    toast({ title: "🛡️ Staking Guardian summoned", description: "Recover the lost Stake Key." });
  };

  const useArea = (a: Area) => {
    const s = g.current;
    const now = performance.now();
    const cd = s.cooldowns[a.id] || 0;
    switch (a.id) {
      case "house": {
        bankProgress();
        s.hp = s.maxHp;
        toast({ title: "🏡 Ranch House", description: "Rewards banked and your Bull is fully rested." });
        pushFx(s.px, s.py - 40, "#facc15", "RESTED");
        break;
      }
      case "fields": {
        if (now < cd) { toast({ title: "🌽 Fields need to regrow", description: "Try again shortly." }); return; }
        s.cooldowns[a.id] = now + 6000;
        const r = 30 + s.level * 6; s.gainedRune += r;
        gainXp(12 + s.level * 2);
        pushFx(s.px, s.py - 40, "#a3e635", `+${r} RUNE`);
        break;
      }
      case "mining": {
        if (now < cd) { toast({ title: "⛏️ Vein depleted", description: "Give the rock a moment." }); return; }
        s.cooldowns[a.id] = now + 6000;
        const r = 40 + s.level * 8; s.gainedRune += r;
        gainXp(18 + s.level * 3);
        pushFx(s.px, s.py - 40, "#f59e0b", `+${r} RUNE`);
        break;
      }
      case "lab": {
        setLoreOpen({ title: "🧪 Research Lab", body: LORE[Math.floor(Math.random() * LORE.length)] });
        if (now >= cd) { s.cooldowns[a.id] = now + 20000; gainXp(40 + s.level * 4); }
        break;
      }
      case "barn": {
        setLoreOpen({ title: "📚 Education Barn", body: LORE[Math.floor(Math.random() * LORE.length)] });
        if (now >= cd) { s.cooldowns[a.id] = now + 20000; gainXp(40 + s.level * 4); }
        break;
      }
      case "stable": {
        if (s.mounted) { toast({ title: "🐴 Already saddled" }); return; }
        s.mounted = true; s.speedMult = 1.45;
        toast({ title: "🐴 Companion saddled", description: "Movement speed increased for this run." });
        break;
      }
      case "arena": { spawnGuardian(); break; }
      case "pasture": case "wilds": case "mountain": {
        toast({ title: `${a.emoji} ${a.name}`, description: a.blurb });
        break;
      }
      case "portal": {
        toast({ title: "🚪 Cardano Portal", description: "Banking your run and returning to the Game Zone…" });
        endRun(false);
        break;
      }
    }
  };

  const allQuestsDone = () => {
    const s = g.current;
    return s.notes >= 5 && s.guardians >= 3 && s.nodes >= 3;
  };

  const tryInteract = () => {
    const s = g.current;
    if (!s.running) return;
    if (s.mode === "dungeon") {
      if (s.bossAlive) { toast({ title: "The vault is sealed", description: "Defeat the boss to open the way." }); return; }
      const d = Math.hypot(s.px - s.exit.x, s.py - s.exit.y);
      if (d < 160 || s.mobs.length === 0) {
        bankProgress();
        if (s.depth >= 3) { endRun(false); return; }
        const nd = s.depth + 1;
        s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.35));
        buildDungeon(nd); setDepth(nd);
        pushFx(s.px, s.py - 40, "#facc15", `DEPTH ${nd}`);
        return;
      }
      toast({ title: "Too far from the stairs", description: "Follow the 🪜 marker on the minimap." });
      return;
    }
    // ranch
    const a = nearestArea();
    if (!a) { toast({ title: "Nothing here", description: "Walk into a Ranch area first." }); return; }
    if (a.id === "house" && allQuestsDone()) {
      // offer dungeon entry through the house hub
      bankProgress();
      s.hp = s.maxHp;
      buildDungeon(1); setMode("dungeon"); setDepth(1);
      toast({ title: "🚪 Ranch Dungeon unlocked", description: "Descend to the ancient research vault." });
      return;
    }
    useArea(a);
  };

  /* ------------------------------ game loop ----------------------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      const dt = Math.min(40, now - last); last = now;
      const s = g.current;
      s.t += dt;

      if (s.running) {
        let dx = 0, dy = 0;
        if (s.keys["w"] || s.keys["arrowup"]) dy -= 1;
        if (s.keys["s"] || s.keys["arrowdown"]) dy += 1;
        if (s.keys["a"] || s.keys["arrowleft"]) dx -= 1;
        if (s.keys["d"] || s.keys["arrowright"]) dx += 1;
        if (s.joy.active) { dx += s.joy.dx; dy += s.joy.dy; }
        const mag = Math.hypot(dx, dy) || 1;
        const spd = 0.07 * dt * s.speedMult;
        if (dx || dy) {
          dx /= mag; dy /= mag;
          if (dx !== 0) s.facing = dx > 0 ? 1 : -1;
          const nx = s.px + dx * spd * 12, ny = s.py + dy * spd * 12;
          if (walkable(nx, s.py)) s.px = nx;
          if (walkable(s.px, ny)) s.py = ny;
        }

        s.atkCd -= dt; s.dashCd -= dt; s.slamCd -= dt; s.invul -= dt;

        for (let i = s.respawns.length - 1; i >= 0; i--) {
          const r = s.respawns[i];
          r.t -= dt;
          if (r.t <= 0) {
            s.respawns.splice(i, 1);
            s.mobs.push({
              id: s.nextId++, x: r.x, y: r.y,
              hp: Math.round(r.def.hp * r.scale), maxHp: Math.round(r.def.hp * r.scale),
              def: r.def, boss: false, cd: 0, hit: 0,
            });
            pushFx(r.x, r.y, r.def.color, undefined, 46);
          }
        }

        if (s.attackReq && s.atkCd <= 0) {
          s.atkCd = 380;
          pushFx(s.px, s.py, s.palette.glow, undefined, 520);
          s.mobs.forEach((m) => { if (Math.hypot(m.x - s.px, m.y - s.py) < 520) damageMob(m, s.atk * (0.9 + Math.random() * 0.35)); });
        }
        s.attackReq = false;
        if (s.dashReq && s.dashCd <= 0) {
          s.dashCd = 2600; s.invul = 420;
          for (let i = 0; i < 14; i++) { const nx = s.px + s.facing * 18; if (walkable(nx, s.py)) s.px = nx; else break; }
          pushFx(s.px, s.py, "#facc15", undefined, 50);
        }
        s.dashReq = false;
        if (s.slamReq && s.slamCd <= 0) {
          s.slamCd = 7000;
          pushFx(s.px, s.py, "#ff4d6d", undefined, 760);
          s.mobs.forEach((m) => { if (Math.hypot(m.x - s.px, m.y - s.py) < 760) damageMob(m, s.atk * 2.1); });
        }
        s.slamReq = false;

        s.mobs.forEach((m) => {
          const d = Math.hypot(s.px - m.x, s.py - m.y);
          const aggro = m.boss ? 1400 : 520;
          m.hit = Math.max(0, m.hit - dt);
          if (d < aggro) {
            const ranged = (m.def as EnemyDef).ranged;
            const keep = ranged ? 240 : 30;
            if (d > keep) {
              const sp = m.def.speed * dt * 0.11;
              const nx = m.x + ((s.px - m.x) / d) * sp * 12;
              const ny = m.y + ((s.py - m.y) / d) * sp * 12;
              if (walkable(nx, m.y)) m.x = nx;
              if (walkable(m.x, ny)) m.y = ny;
            }
            m.cd -= dt;
            if (m.cd <= 0) {
              if (ranged && d > 90) {
                m.cd = 1500;
                s.shots.push({ x: m.x, y: m.y, vx: ((s.px - m.x) / d) * 0.42, vy: ((s.py - m.y) / d) * 0.42, life: 2200, dmg: m.def.dmg, friendly: false, color: m.def.color });
              } else if (d < (m.boss ? 110 : 62)) {
                m.cd = m.boss ? 900 : 1100;
                hitPlayer(m.def.dmg * (1 + s.depth * 0.15));
              } else m.cd = 300;
            }
          }
        });

        s.shots = s.shots.filter((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (!walkable(p.x, p.y)) return false;
          if (!p.friendly && Math.hypot(p.x - s.px, p.y - s.py) < 24) { hitPlayer(p.dmg); return false; }
          return p.life > 0;
        });

        s.pickups.forEach((p) => {
          if (p.taken) return;
          if (Math.hypot(p.x - s.px, p.y - s.py) < 46) {
            p.taken = true;
            if (p.kind === "potion") { s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.28)); pushFx(p.x, p.y - 20, "#34d399", "+HP"); }
            else if (p.kind === "chest") { const r = 25 + s.level * 8; s.gainedRune += r; pushFx(p.x, p.y - 20, "#facc15", `+${r} RUNE`); }
            else if (p.kind === "rune") { const x2 = 20 + s.level * 6; gainXp(x2); pushFx(p.x, p.y - 20, "#a78bfa", `+${x2} EXP`); }
            else if (p.kind === "note") {
              s.notes += 1; gainXp(60 + s.level * 5);
              pushFx(p.x, p.y - 20, "#00d4ff", `RESEARCH NOTE ${s.notes}/5`);
              setQuests({ notes: s.notes, guardians: s.guardians, nodes: s.nodes });
              if (s.notes === 5) { s.gainedRune += QUESTS[0].reward; toast({ title: "📝 Quest complete: Build the Future", description: QUESTS[0].lore }); }
            } else if (p.kind === "node") {
              s.nodes += 1; gainXp(80 + s.level * 6);
              pushFx(p.x, p.y - 20, "#38bdf8", `NODE ONLINE ${s.nodes}/3`);
              setQuests({ notes: s.notes, guardians: s.guardians, nodes: s.nodes });
              if (s.nodes === 3) { s.gainedRune += QUESTS[2].reward; toast({ title: "🛰️ Quest complete: Decentralization", description: QUESTS[2].lore }); }
            }
          }
        });

        const pi = Math.floor(s.px / TILE), pj = Math.floor(s.py / TILE);
        const sight = s.mode === "ranch" ? 10 : 7;
        for (let j = pj - sight; j <= pj + sight; j++) for (let i = pi - sight; i <= pi + sight; i++) {
          if (i < 0 || j < 0 || i >= MAP_W || j >= MAP_H) continue;
          if (Math.hypot(i - pi, j - pj) < sight + 0.5) s.explored[j * MAP_W + i] = 1;
        }

        s.fx = s.fx.filter((f) => { f.life -= dt; return f.life > 0; });
        s.nearArea = s.mode === "ranch" ? nearestArea() : null;

        const boss = s.mobs.find((m) => m.boss);
        setHud({
          hp: Math.max(0, Math.round(s.hp)), maxHp: s.maxHp, level: s.level, exp: Math.round(s.exp),
          need: expForLevel(s.level), kills: s.kills, rune: s.gainedRune + s.bankedRune, xp: s.gainedXp + s.bankedXp,
          bossHp: boss?.hp || 0, bossMax: boss?.maxHp || 0, bossName: boss?.def.name || "",
          area: s.mode === "dungeon" ? `${s.palette.emoji} ${s.palette.name} · Depth ${s.depth}` : (s.nearArea ? `${s.nearArea.emoji} ${s.nearArea.name}` : "🌾 Open Ranch"),
        });
      }

      draw(ctx, cv);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const gainXp = (amount: number) => {
    const s = g.current;
    s.exp += amount; s.gainedXp += amount;
    while (s.exp >= expForLevel(s.level)) {
      s.exp -= expForLevel(s.level);
      s.level += 1; s.levelUps += 1;
      s.maxHp += 14; s.hp = s.maxHp; s.atk += 2;
      pushFx(s.px, s.py - 60, "#facc15", `LEVEL ${s.level}!`);
    }
  };

  const damageMob = (m: Mob, dmg: number) => {
    const s = g.current;
    const crit = Math.random() < 0.15;
    const total = Math.round(dmg * (crit ? 2 : 1));
    m.hp -= total; m.hit = 220;
    pushFx(m.x, m.y - 26, crit ? "#facc15" : "#ffffff", `${total}${crit ? "!" : ""}`);
    if (m.hp <= 0) {
      s.mobs = s.mobs.filter((o) => o.id !== m.id);
      s.kills += 1;
      const scale = 1 + s.depth * 0.2;
      gainXp(Math.round(m.def.xp * scale * 3));
      s.gainedRune += Math.round(m.def.rune * scale * 2);
      pushFx(m.x, m.y, m.def.color, m.boss ? "DEFEATED" : undefined, m.boss ? 200 : 60);
      if (m.boss) {
        gainXp(expForLevel(s.level) - s.exp); // bosses guarantee a level
        s.pickups.push({ x: m.x, y: m.y, kind: "chest", taken: false });
        if (m.guardian) {
          s.guardians += 1;
          setQuests({ notes: s.notes, guardians: s.guardians, nodes: s.nodes });
          pushFx(m.x, m.y - 50, "#38bdf8", `STAKE KEY ${s.guardians}/3`);
          if (s.guardians === 3) { s.gainedRune += QUESTS[1].reward; toast({ title: "🛡️ Quest complete: Proof of Stake", description: QUESTS[1].lore }); }
          s.bossAlive = s.mobs.some((o) => o.boss);
        } else {
          s.bossAlive = false;
          if (m.def.id === "chaos-engine") toast({ title: "⚙️ THE CHAOS ENGINE falls", description: "The ancient research vault is yours. Take the stairs to bank everything." });
        }
      } else {
        s.respawns.push({ t: 5000, def: m.def as EnemyDef, x: m.x, y: m.y, scale: 1 + s.depth * 0.35 });
      }
    }
  };

  const hitPlayer = (dmg: number) => {
    const s = g.current;
    if (s.invul > 0) return;
    const taken = Math.max(1, Math.round(dmg - s.def));
    s.hp -= taken; s.invul = 380;
    pushFx(s.px, s.py - 34, "#ff4d6d", `-${taken}`);
    if (s.hp <= 0) { s.hp = 0; endRun(true); }
  };

  /* -------------------------------- render ------------------------------ */
  const draw = (ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement) => {
    const s = g.current;
    const W = cv.clientWidth, H = cv.clientHeight;
    s.camX = s.px - W / 2; s.camY = s.py - H / 2;
    const b = s.palette;

    ctx.fillStyle = s.mode === "ranch" ? "#08130c" : "#04070d";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-s.camX, -s.camY);

    const i0 = Math.max(0, Math.floor(s.camX / TILE)), i1 = Math.min(MAP_W - 1, Math.ceil((s.camX + W) / TILE));
    const j0 = Math.max(0, Math.floor(s.camY / TILE)), j1 = Math.min(MAP_H - 1, Math.ceil((s.camY + H) / TILE));

    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const idx = j * MAP_W + i;
        if (!s.explored[idx]) continue;
        const x = i * TILE, y = j * TILE;
        if (s.grid[idx] === 0) {
          ctx.fillStyle = (i + j) % 2 === 0 ? b.floor : b.floor2;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = "rgba(255,255,255,0.03)";
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
          if (s.mode === "ranch" && (i * 5 + j * 11) % 17 === 0) {
            ctx.fillStyle = "rgba(126,224,129,0.16)";
            ctx.fillRect(x + 16, y + 20, 4, 12);
            ctx.fillRect(x + 26, y + 24, 4, 8);
          }
        } else {
          ctx.fillStyle = b.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = b.wallTop;
          ctx.fillRect(x, y, TILE, 10);
          if (s.mode === "ranch" && (i * 3 + j * 7) % 5 === 0) {
            ctx.font = "26px serif"; ctx.textAlign = "center";
            ctx.fillText((i + j) % 3 === 0 ? "🌲" : (i + j) % 3 === 1 ? "🪵" : "🪨", x + TILE / 2, y + TILE - 10);
          }
        }
      }
    }

    /* ranch area landmarks */
    if (s.mode === "ranch") {
      AREAS.forEach((a) => {
        const ax = a.tx * TILE, ay = a.ty * TILE;
        if (!s.explored[Math.floor(ay / TILE) * MAP_W + Math.floor(ax / TILE)]) return;
        const pulse = 40 + Math.sin(s.t / 300 + a.tx) * 5;
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = a.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ax, ay, pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = "40px serif"; ctx.textAlign = "center";
        ctx.fillText(a.emoji, ax, ay + 14);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        const label = a.name.toUpperCase();
        ctx.font = "bold 12px system-ui";
        const tw = ctx.measureText(label).width + 12;
        ctx.fillRect(ax - tw / 2, ay + 26, tw, 18);
        ctx.fillStyle = a.color;
        ctx.fillText(label, ax, ay + 39);
      });
    } else {
      /* dungeon stairs */
      if (s.explored[Math.floor(s.exit.y / TILE) * MAP_W + Math.floor(s.exit.x / TILE)]) {
        const pulse = 26 + Math.sin(s.t / 220) * 5;
        ctx.globalAlpha = s.bossAlive ? 0.3 : 0.9;
        ctx.strokeStyle = "#facc15"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(s.exit.x, s.exit.y, pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "26px serif"; ctx.textAlign = "center";
        ctx.fillText("🪜", s.exit.x, s.exit.y + 9);
        ctx.globalAlpha = 1;
      }
    }

    s.pickups.forEach((p) => {
      if (p.taken) return;
      const idx = Math.floor(p.y / TILE) * MAP_W + Math.floor(p.x / TILE);
      if (!s.explored[idx]) return;
      const bob = Math.sin(s.t / 260 + p.x) * 4;
      ctx.font = "26px serif"; ctx.textAlign = "center";
      const icon = p.kind === "potion" ? "🧪" : p.kind === "chest" ? "🧰" : p.kind === "rune" ? "🔷" : p.kind === "note" ? "📝" : "🛰️";
      ctx.fillText(icon, p.x, p.y + bob);
    });

    s.mobs.forEach((m) => {
      const idx = Math.floor(m.y / TILE) * MAP_W + Math.floor(m.x / TILE);
      if (!s.explored[idx]) return;
      const r = m.boss ? 40 : (m.def as EnemyDef).radius;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.ellipse(m.x, m.y + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = m.def.color; ctx.shadowBlur = m.hit > 0 ? 28 : 14;
      ctx.fillStyle = m.hit > 0 ? "#ffffff" : m.def.color + "55";
      ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(r * 1.5)}px serif`; ctx.textAlign = "center";
      ctx.fillText(m.def.emoji, m.x, m.y + r * 0.55);
      const bw = r * 2;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(m.x - bw / 2, m.y - r - 14, bw, 5);
      ctx.fillStyle = m.boss ? "#ff4d6d" : "#7ef29d";
      ctx.fillRect(m.x - bw / 2, m.y - r - 14, bw * Math.max(0, m.hp / m.maxHp), 5);
    });

    s.shots.forEach((p) => {
      ctx.shadowColor = p.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    const pr = 24;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.ellipse(s.px, s.py + 22, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = b.glow; ctx.shadowBlur = s.invul > 0 ? 34 : 20;
    ctx.beginPath(); ctx.arc(s.px, s.py, pr + 3, 0, Math.PI * 2);
    ctx.strokeStyle = b.glow; ctx.lineWidth = 3; ctx.stroke();
    ctx.clip();
    const img = bullImgRef.current;
    if (img) ctx.drawImage(img, s.px - pr, s.py - pr, pr * 2, pr * 2);
    else { ctx.fillStyle = "#0b1220"; ctx.fill(); ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.fillText("🐂", s.px, s.py + 10); }
    ctx.restore();
    if (s.mounted) { ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText("🐴", s.px + 22, s.py + 26); }

    s.fx.forEach((f) => {
      const a = f.life / f.max;
      ctx.globalAlpha = a;
      if (f.r) { ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.15 - a), 0, Math.PI * 2); ctx.stroke(); }
      if (f.text) { ctx.fillStyle = f.color; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.fillText(f.text, f.x, f.y - (1 - a) * 26); }
      ctx.globalAlpha = 1;
    });

    ctx.restore();
    const light = ctx.createRadialGradient(W / 2, H / 2, s.mode === "ranch" ? 200 : 90, W / 2, H / 2, Math.max(W, H) * 0.66);
    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(1, b.fog);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);

    /* minimap — centred above the bottom controls */
    const MM = 96, mmx = W / 2 - MM / 2, mmy = H - MM - 28, sc = MM / MAP_W;
    ctx.fillStyle = "rgba(3,8,16,0.85)";
    ctx.fillRect(mmx, mmy, MM, MM);
    ctx.strokeStyle = b.glow + "88"; ctx.strokeRect(mmx + 0.5, mmy + 0.5, MM, MM);
    for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
      const idx = j * MAP_W + i;
      if (!s.explored[idx] || s.grid[idx] !== 0) continue;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(mmx + i * sc, mmy + j * sc, sc, sc);
    }
    if (s.mode === "ranch") {
      AREAS.forEach((a) => { ctx.fillStyle = a.color; ctx.fillRect(mmx + a.tx * sc - 1, mmy + a.ty * sc - 1, 3, 3); });
    } else {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(mmx + (s.exit.x / TILE) * sc - 1, mmy + (s.exit.y / TILE) * sc - 1, 4, 4);
    }
    ctx.fillStyle = b.glow;
    ctx.fillRect(mmx + (s.px / TILE) * sc - 1, mmy + (s.py / TILE) * sc - 1, 4, 4);
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "left";
    ctx.fillText(s.mode === "ranch" ? "🌾 Hoskinson Ranch" : `${b.emoji} ${b.name} · Depth ${s.depth}`, mmx, mmy - 6);
  };

  /* ------------------------------- joystick ----------------------------- */
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyMove = (e: React.TouchEvent | React.MouseEvent) => {
    const el = joyRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const pt: any = "touches" in e ? e.touches[0] : e;
    if (!pt) return;
    let dx = pt.clientX - (r.left + r.width / 2);
    let dy = pt.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy), max = r.width / 2;
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    setKnob({ x: dx, y: dy });
    g.current.joy = { active: true, dx: dx / max, dy: dy / max };
  };
  const joyEnd = () => { setKnob({ x: 0, y: 0 }); g.current.joy = { active: false, dx: 0, dy: 0 }; };

  /* ================================ UI ================================== */

  if (phase === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 text-foreground p-3 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
            <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} Rune Power</div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 bg-clip-text text-transparent">🐂🌾 CHARLES HOSKINSON RANCH</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
              A fictional Cardano ranch world built by the CsB community. Explore 11 areas, complete Cardano quests,
              farm, mine, learn the lore, then descend into the Ranch Dungeon and face THE CHAOS ENGINE.
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-2 max-w-xl mx-auto">
              Fan-made game world inspired by Cardano themes and IOG research history. Not affiliated with, endorsed by,
              or representing any real person, company or foundation.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {AREAS.map((a) => (
              <Card key={a.id} className="p-3 bg-slate-900/60 border-slate-700">
                <div className="text-xl">{a.emoji} <span className="font-bold text-sm" style={{ color: a.color }}>{a.name}</span></div>
                <div className="text-muted-foreground mt-1">{a.blurb}</div>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-slate-900/60 border-emerald-700/50">
            <div className="font-bold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-300" /> Cardano Quests</div>
            <div className="grid md:grid-cols-3 gap-2 text-xs">
              {QUESTS.map((q) => (
                <div key={q.id} className="p-2 rounded bg-black/30">
                  <div className="font-bold">{q.emoji} {q.title}</div>
                  <div className="text-muted-foreground">{q.desc}</div>
                  <div className="text-amber-300 mt-1">+{q.reward} Rune Power</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Finish all three to unlock the Ranch Dungeon at the 🏡 Ranch House.</div>
          </Card>

          {heldBulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls found in your wallet. Register them in NFT Power first.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">SELECT YOUR BULL TO ENTER</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...heldBulls].sort((a, b) => (b.level || 1) - (a.level || 1)).map((b, i) => (
                  <Card key={b.nft_id} onClick={() => startRun(b)}
                    className={`relative p-3 bg-gradient-to-br from-emerald-900/60 to-slate-900 border-2 cursor-pointer hover:scale-[1.03] hover:border-emerald-300 transition-all ${i === 0 ? "border-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,0.35)]" : "border-emerald-400/30"}`}>
                    {i === 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-300 text-black text-[9px] font-black tracking-wide">MAX LEVEL</div>
                    )}
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-emerald-300/20">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-80">Lv {b.level} · {Math.round(120 + (b.level || 1) * 14)} HP</div>
                    <Button size="sm" className="w-full mt-2"><Swords className="w-3 h-3 mr-1" /> Enter Ranch</Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "dead" || phase === "cleared") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 text-foreground p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center bg-slate-900/80 border-slate-700 space-y-3">
          <div className="text-5xl">{phase === "dead" ? "☠️" : "🌾"}</div>
          <h2 className="text-2xl font-black">{phase === "dead" ? "Fallen on the Ranch" : "Ranch Run Banked"}</h2>
          <p className="text-sm text-muted-foreground">{phase === "dead" ? "Half your haul was lost in the fields." : "Full rewards secured."}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded bg-black/30"><div className="text-amber-300 font-bold text-lg">+{runSummary.rune}</div>Rune Power</div>
            <div className="p-3 rounded bg-black/30"><div className="text-violet-300 font-bold text-lg">+{runSummary.xp}</div>EXP</div>
            <div className="p-3 rounded bg-black/30"><div className="font-bold text-lg">{runSummary.kills}</div>Kills</div>
            <div className="p-3 rounded bg-black/30"><div className="font-bold text-lg">{runSummary.floors}</div>Dungeon Depth</div>
          </div>
          <div className="text-emerald-300 font-bold">{runSummary.title}</div>
          {runSummary.levels > 0 && <div className="text-amber-300 font-bold">⭐ {bull?.nft_name} gained {runSummary.levels} level{runSummary.levels > 1 ? "s" : ""}!</div>}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPhase("select")}>Run Again</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------- playing ------------------------------ */
  const questsDone = quests.notes >= 5 && quests.guardians >= 3 && quests.nodes >= 3;
  return (
    <div className="fixed inset-0 bg-black text-foreground select-none">
      <canvas ref={canvasRef} className="w-full h-full block" onMouseDown={() => { g.current.attackReq = true; }} />

      {/* top HUD */}
      <div className="absolute top-2 left-2 right-2 pointer-events-none">
        <Card className="p-2 bg-slate-950/80 border-emerald-500/30 backdrop-blur max-w-xs pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-black/50 ring-1 ring-emerald-400/40 flex items-center justify-center">
              {bull?.image ? <img src={bull.image} alt={bull.nft_name} className="w-full h-full object-cover" /> : <span>🐂</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="truncate">{bull?.nft_name} · Lv {hud.level}</span>
                <span className="text-rose-300 flex items-center gap-1"><Heart className="w-3 h-3" />{hud.hp}/{hud.maxHp}</span>
              </div>
              <Progress value={(hud.hp / hud.maxHp) * 100} className="h-1.5 mt-1" />
              <Progress value={(hud.exp / hud.need) * 100} className="h-1 mt-1 [&>div]:bg-violet-400" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
            <span className="truncate max-w-[110px]">{hud.area}</span>
            <span>⚔️ {hud.kills}</span>
            <span className="text-violet-300">+{hud.xp} EXP</span>
            <span className="text-amber-300">+{hud.rune} RUNE</span>
          </div>
        </Card>

        {/* quest tracker */}
        <Card className="mt-2 p-2 bg-slate-950/75 border-cyan-500/30 max-w-[190px] text-[10px] pointer-events-auto">
          <div className="font-bold text-cyan-200 mb-1">🧠 Cardano Quests</div>
          <div className={quests.notes >= 5 ? "text-emerald-300" : ""}>📝 Research notes {quests.notes}/5</div>
          <div className={quests.guardians >= 3 ? "text-emerald-300" : ""}>🛡️ Stake Keys {quests.guardians}/3</div>
          <div className={quests.nodes >= 3 ? "text-emerald-300" : ""}>🛰️ Nodes online {quests.nodes}/3</div>
          {questsDone && mode === "ranch" && <div className="text-amber-300 font-bold mt-1">🏡 Dungeon unlocked — go to the Ranch House</div>}
        </Card>

        {hud.bossMax > 0 && (
          <Card className="mt-2 p-2 bg-slate-950/85 border-rose-500/40 max-w-md mx-auto pointer-events-auto">
            <div className="flex justify-between text-[11px] font-bold text-rose-200">
              <span className="flex items-center gap-1"><Skull className="w-3 h-3" /> {hud.bossName}</span>
              <span>{hud.bossHp}/{hud.bossMax}</span>
            </div>
            <Progress value={(hud.bossHp / hud.bossMax) * 100} className="h-2 mt-1 [&>div]:bg-rose-500" />
          </Card>
        )}
      </div>

      {/* lore popup */}
      {loreOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-20" onClick={() => setLoreOpen(null)}>
          <Card className="p-5 max-w-sm bg-slate-900 border-cyan-500/40 text-center space-y-3">
            <div className="text-lg font-black">{loreOpen.title}</div>
            <p className="text-sm text-muted-foreground">{loreOpen.body}</p>
            <Button size="sm" onClick={() => setLoreOpen(null)}>Got it</Button>
          </Card>
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-4 left-4">
        <div ref={joyRef}
          className="w-32 h-32 rounded-full bg-slate-900/50 border-2 border-emerald-400/40 relative touch-none"
          onTouchStart={joyMove} onTouchMove={joyMove} onTouchEnd={joyEnd}
          onMouseDown={joyMove} onMouseMove={(e) => g.current.joy.active && joyMove(e)} onMouseUp={joyEnd} onMouseLeave={joyEnd}>
          <div className="absolute w-14 h-14 rounded-full bg-emerald-400/40 border border-emerald-200/60 top-1/2 left-1/2"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-amber-400/60 text-amber-300" onClick={() => { g.current.dashReq = true; }}><Zap className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="border-rose-400/60 text-rose-300" onClick={() => { g.current.slamReq = true; }}><Shield className="w-4 h-4" /></Button>
        </div>
        <Button className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-2xl shadow-[0_0_25px_rgba(52,211,153,0.6)]"
          onTouchStart={(e) => { e.preventDefault(); g.current.attackReq = true; }}
          onClick={() => { g.current.attackReq = true; }}>⚔️</Button>
        <Button size="sm" variant="secondary" onClick={tryInteract}>
          {mode === "dungeon" ? "DESCEND" : "INTERACT"}
        </Button>
        <div className="text-[10px] text-emerald-200/80 text-right max-w-[190px] pointer-events-none">
          {mode === "dungeon"
            ? (g.current.bossAlive ? "Defeat the boss to open the stairs" : "Reach 🪜 and press E / tap DESCEND")
            : "Walk into an area, then press E / tap INTERACT"}
        </div>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => endRun(false)}>Leave & Bank</Button>
      </div>
    </div>
  );
}
