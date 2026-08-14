import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Swords, Heart, Sparkles, Skull, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";

/* ============================ DUNGEON DATA ============================== */

const TILE = 48;
const MAP_W = 64;
const MAP_H = 64;

type Biome = { id: string; name: string; emoji: string; floor: string; floor2: string; wall: string; wallTop: string; glow: string; fog: string };

const BIOMES: Biome[] = [
  { id: "catacombs", name: "Bull Catacombs", emoji: "💀", floor: "#1b1f2b", floor2: "#232838", wall: "#0d1017", wallTop: "#39425c", glow: "#00d4ff", fog: "rgba(4,8,16,0.90)" },
  { id: "emberforge", name: "Ember Forge", emoji: "🔥", floor: "#2a1712", floor2: "#341c14", wall: "#150a08", wallTop: "#6b3320", glow: "#ff7a2b", fog: "rgba(18,6,2,0.90)" },
  { id: "frostcrypt", name: "Frost Crypt", emoji: "❄️", floor: "#16222e", floor2: "#1d2c3b", wall: "#0a1119", wallTop: "#3d5a75", glow: "#9ee6ff", fog: "rgba(4,10,18,0.90)" },
  { id: "runevault", name: "Rune Vault", emoji: "🔮", floor: "#1e1830", floor2: "#28203f", wall: "#100c1c", wallTop: "#4d3a78", glow: "#c084fc", fog: "rgba(8,4,18,0.90)" },
  { id: "abyss", name: "The Abyss", emoji: "🕳️", floor: "#12181a", floor2: "#182123", wall: "#070b0c", wallTop: "#2c4a44", glow: "#31e6a8", fog: "rgba(2,8,8,0.92)" },
];

type EnemyDef = { id: string; name: string; emoji: string; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string; radius: number; ranged?: boolean };

const ENEMIES: EnemyDef[] = [
  { id: "crypt-rat", name: "Crypt Rat", emoji: "🐀", hp: 26, dmg: 5, speed: 1.7, xp: 9, rune: 3, color: "#8d8577", radius: 15 },
  { id: "bone-knight", name: "Bone Knight", emoji: "💀", hp: 62, dmg: 11, speed: 1.15, xp: 20, rune: 7, color: "#d7d3c4", radius: 19 },
  { id: "ember-imp", name: "Ember Imp", emoji: "👺", hp: 44, dmg: 9, speed: 1.5, xp: 17, rune: 6, color: "#ff7a3d", radius: 17 },
  { id: "frost-wraith", name: "Frost Wraith", emoji: "👻", hp: 55, dmg: 13, speed: 1.35, xp: 24, rune: 9, color: "#a8e6ff", radius: 18, ranged: true },
  { id: "rune-golem", name: "Rune Golem", emoji: "🗿", hp: 120, dmg: 17, speed: 0.8, xp: 40, rune: 15, color: "#a988ff", radius: 24 },
  { id: "void-stalker", name: "Void Stalker", emoji: "🦂", hp: 80, dmg: 15, speed: 1.9, xp: 34, rune: 12, color: "#31e6a8", radius: 19 },
  { id: "shade-archer", name: "Shade Archer", emoji: "🏹", hp: 48, dmg: 12, speed: 1.25, xp: 26, rune: 10, color: "#7bd3ff", radius: 17, ranged: true },
];

type BossDef = { id: string; name: string; emoji: string; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string };

const BOSSES: BossDef[] = [
  { id: "gravelord", name: "Gravelord Mokk", emoji: "☠️", hp: 620, dmg: 22, speed: 1.05, xp: 260, rune: 120, color: "#00d4ff" },
  { id: "forgetyrant", name: "Forge Tyrant Vulk", emoji: "🔥", hp: 880, dmg: 27, speed: 1.15, xp: 360, rune: 170, color: "#ff7a2b" },
  { id: "frostjarl", name: "Frost Jarl Hrym", emoji: "🧊", hp: 1100, dmg: 31, speed: 1.2, xp: 460, rune: 220, color: "#9ee6ff" },
  { id: "runearch", name: "Rune Archon", emoji: "🔮", hp: 1400, dmg: 36, speed: 1.25, xp: 600, rune: 300, color: "#c084fc" },
  { id: "abysshorn", name: "Abyss Horn", emoji: "🐂", hp: 1800, dmg: 42, speed: 1.3, xp: 800, rune: 420, color: "#31e6a8" },
];

const RARITY_MULT: Record<string, number> = { common: 1, rare: 1.15, epic: 1.3, legendary: 1.5 };

export function expForLevel(level: number) {
  return 80 + level * 40;
}

/* ============================ MAP GENERATION ============================ */

type Rect = { x: number; y: number; w: number; h: number };

function genDungeon(floor: number) {
  const grid: number[] = new Array(MAP_W * MAP_H).fill(1); // 1 = wall, 0 = floor
  const rooms: Rect[] = [];
  const target = 9 + Math.min(7, Math.floor(floor / 2));
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

interface Mob {
  id: number; x: number; y: number; hp: number; maxHp: number; def: EnemyDef | BossDef;
  boss: boolean; cd: number; hit: number; vx: number; vy: number;
}
interface Shot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; friendly: boolean; color: string }
interface Pickup { x: number; y: number; kind: "potion" | "chest" | "rune"; taken: boolean }
interface Fx { x: number; y: number; life: number; max: number; text?: string; color: string; r?: number }

export default function CsbLevelDungeon() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();
  const heldBulls = useHeldCsbBulls(userId, walletNfts as any);

  const [phase, setPhase] = useState<"select" | "playing" | "dead" | "cleared">("select");
  const [bull, setBull] = useState<HeldCsbBull | null>(null);
  const [floor, setFloor] = useState(1);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, exp: 0, need: 120, kills: 0, rune: 0, xp: 0, bossHp: 0, bossMax: 0, bossName: "" });
  const [runSummary, setRunSummary] = useState({ rune: 0, xp: 0, kills: 0, floors: 0, levels: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bullImgRef = useRef<HTMLImageElement | null>(null);

  /* ------------------------------ game state ---------------------------- */
  const g = useRef({
    grid: [] as number[], rooms: [] as Rect[], biome: BIOMES[0],
    px: 0, py: 0, vx: 0, vy: 0, facing: 1, dashCd: 0, slamCd: 0, invul: 0,
    hp: 100, maxHp: 100, atk: 12, def: 2, atkCd: 0,
    level: 1, exp: 0, gainedXp: 0, gainedRune: 0, kills: 0, levelUps: 0,
    mobs: [] as Mob[], shots: [] as Shot[], pickups: [] as Pickup[], fx: [] as Fx[],
    explored: new Uint8Array(MAP_W * MAP_H),
    keys: {} as Record<string, boolean>, joy: { active: false, dx: 0, dy: 0 },
    exit: { x: 0, y: 0 }, bossAlive: false, floor: 1, running: false, t: 0, camX: 0, camY: 0,
    attackReq: false, dashReq: false, slamReq: false,
  });

  /* load bull art */
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
    g.current.fx.push({ x, y, life: 620, max: 620, color, text, r });
  };

  /* ----------------------------- floor build ---------------------------- */
  const buildFloor = useCallback((f: number, keepHp = true) => {
    const s = g.current;
    const { grid, rooms } = genDungeon(f);
    s.grid = grid; s.rooms = rooms; s.floor = f;
    s.biome = BIOMES[(f - 1) % BIOMES.length];
    s.explored = new Uint8Array(MAP_W * MAP_H);
    s.mobs = []; s.shots = []; s.pickups = []; s.fx = [];
    s.px = cx(rooms[0]); s.py = cy(rooms[0]);
    const last = rooms[rooms.length - 1];
    s.exit = { x: cx(last), y: cy(last) };
    if (!keepHp) { s.hp = s.maxHp; }

    let id = 1;
    const isBossFloor = f % 5 === 0;
    const pool = ENEMIES.filter((_, i) => i <= Math.min(ENEMIES.length - 1, 1 + Math.floor(f / 1.4)));
    rooms.forEach((r, ri) => {
      if (ri === 0) return;
      const count = 2 + Math.floor(Math.random() * 3) + Math.floor(f / 3);
      for (let k = 0; k < count; k++) {
        const def = pool[Math.floor(Math.random() * pool.length)];
        const scale = 1 + (f - 1) * 0.28;
        s.mobs.push({
          id: id++, x: (r.x + 1 + Math.random() * (r.w - 2)) * TILE, y: (r.y + 1 + Math.random() * (r.h - 2)) * TILE,
          hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), def, boss: false, cd: 0, hit: 0, vx: 0, vy: 0,
        });
      }
      if (Math.random() < 0.55) s.pickups.push({ x: cx(r), y: cy(r), kind: Math.random() < 0.5 ? "potion" : "chest", taken: false });
      if (Math.random() < 0.4) s.pickups.push({ x: cx(r) + 60, y: cy(r) - 40, kind: "rune", taken: false });
    });

    s.bossAlive = false;
    if (isBossFloor) {
      const bd = BOSSES[Math.min(BOSSES.length - 1, Math.floor(f / 5) - 1)];
      const scale = 1 + (f - 5) * 0.2;
      s.mobs.push({
        id: id++, x: s.exit.x, y: s.exit.y, hp: Math.round(bd.hp * scale), maxHp: Math.round(bd.hp * scale),
        def: bd, boss: true, cd: 0, hit: 0, vx: 0, vy: 0,
      });
      s.bossAlive = true;
    }
  }, []);

  /* ------------------------------ persistence --------------------------- */
  const persist = useCallback(async (finalRune: number, finalXp: number, newLevel: number, newExp: number) => {
    if (!userId || !bull) return;
    if (finalRune > 0) await addBalance(finalRune);
    await supabase.from("csbv1_nft_power" as any)
      .update({ level: newLevel, exp: newExp, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("nft_id", bull.nft_id);
    await supabase.from("game_results").insert({
      user_id: userId, game_name: "CsB Level Dungeon", result: "win", diamonds_won: 0,
    });
  }, [userId, bull, addBalance]);

  const endRun = useCallback((died: boolean) => {
    const s = g.current;
    s.running = false;
    const rune = died ? Math.floor(s.gainedRune * 0.5) : s.gainedRune;
    const xp = died ? Math.floor(s.gainedXp * 0.5) : s.gainedXp;
    setRunSummary({ rune, xp, kills: s.kills, floors: s.floor, levels: s.levelUps });
    setPhase(died ? "dead" : "cleared");
    persist(rune, xp, s.level, s.exp);
    toast({ title: died ? "☠️ You fell in the dungeon" : "🏆 Dungeon Escape!", description: `+${rune} Rune Power · +${xp} EXP` });
  }, [persist, toast]);

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
    s.gainedRune = 0; s.gainedXp = 0; s.kills = 0; s.levelUps = 0;
    s.dashCd = 0; s.slamCd = 0; s.invul = 0; s.atkCd = 0;
    setBull(b);
    setFloor(1);
    buildFloor(1, false);
    s.running = true;
    setPhase("playing");
  };

  const nextFloor = () => {
    const s = g.current;
    const f = s.floor + 1;
    s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.3));
    buildFloor(f, true);
    setFloor(f);
    pushFx(s.px, s.py - 40, "#facc15", `FLOOR ${f}`);
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

  const tryInteract = () => {
    const s = g.current;
    if (!s.running) return;
    const d = Math.hypot(s.px - s.exit.x, s.py - s.exit.y);
    if (d < 90 && !s.bossAlive) nextFloor();
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
        /* ---------------- movement ---------------- */
        let dx = 0, dy = 0;
        if (s.keys["w"] || s.keys["arrowup"]) dy -= 1;
        if (s.keys["s"] || s.keys["arrowdown"]) dy += 1;
        if (s.keys["a"] || s.keys["arrowleft"]) dx -= 1;
        if (s.keys["d"] || s.keys["arrowright"]) dx += 1;
        if (s.joy.active) { dx += s.joy.dx; dy += s.joy.dy; }
        const mag = Math.hypot(dx, dy) || 1;
        const spd = 0.155 * dt;
        if (dx || dy) {
          dx /= mag; dy /= mag;
          if (dx !== 0) s.facing = dx > 0 ? 1 : -1;
          const nx = s.px + dx * spd * 12, ny = s.py + dy * spd * 12;
          if (walkable(nx, s.py)) s.px = nx;
          if (walkable(s.px, ny)) s.py = ny;
        }

        /* ---------------- abilities ---------------- */
        s.atkCd -= dt; s.dashCd -= dt; s.slamCd -= dt; s.invul -= dt;
        if (s.attackReq && s.atkCd <= 0) {
          s.atkCd = 380;
          pushFx(s.px + s.facing * 40, s.py, s.biome.glow, undefined, 62);
          s.mobs.forEach((m) => {
            const d = Math.hypot(m.x - s.px, m.y - s.py);
            if (d < 95) damageMob(m, s.atk * (0.9 + Math.random() * 0.35));
          });
        }
        s.attackReq = false;
        if (s.dashReq && s.dashCd <= 0) {
          s.dashCd = 2600; s.invul = 420;
          for (let i = 0; i < 14; i++) {
            const nx = s.px + s.facing * 18, ny = s.py;
            if (walkable(nx, ny)) s.px = nx; else break;
          }
          pushFx(s.px, s.py, "#facc15", undefined, 50);
        }
        s.dashReq = false;
        if (s.slamReq && s.slamCd <= 0) {
          s.slamCd = 7000;
          pushFx(s.px, s.py, "#ff4d6d", undefined, 190);
          s.mobs.forEach((m) => {
            const d = Math.hypot(m.x - s.px, m.y - s.py);
            if (d < 200) damageMob(m, s.atk * 2.1);
          });
        }
        s.slamReq = false;

        /* ---------------- mobs ---------------- */
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
                hitPlayer(m.def.dmg * (1 + (s.floor - 1) * 0.12));
              } else m.cd = 300;
            }
          }
        });

        /* ---------------- shots ---------------- */
        s.shots = s.shots.filter((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (!walkable(p.x, p.y)) return false;
          if (!p.friendly && Math.hypot(p.x - s.px, p.y - s.py) < 24) { hitPlayer(p.dmg); return false; }
          return p.life > 0;
        });

        /* ---------------- pickups ---------------- */
        s.pickups.forEach((p) => {
          if (p.taken) return;
          if (Math.hypot(p.x - s.px, p.y - s.py) < 44) {
            p.taken = true;
            if (p.kind === "potion") { s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.28)); pushFx(p.x, p.y - 20, "#34d399", "+HP"); }
            else if (p.kind === "chest") { const r = 25 + s.floor * 12; s.gainedRune += r; pushFx(p.x, p.y - 20, "#facc15", `+${r} RUNE`); }
            else { const x2 = 20 + s.floor * 10; gainXp(x2); pushFx(p.x, p.y - 20, "#a78bfa", `+${x2} EXP`); }
          }
        });

        /* ---------------- fog reveal ---------------- */
        const pi = Math.floor(s.px / TILE), pj = Math.floor(s.py / TILE);
        for (let j = pj - 7; j <= pj + 7; j++) for (let i = pi - 7; i <= pi + 7; i++) {
          if (i < 0 || j < 0 || i >= MAP_W || j >= MAP_H) continue;
          if (Math.hypot(i - pi, j - pj) < 7.5) s.explored[j * MAP_W + i] = 1;
        }

        s.fx = s.fx.filter((f) => { f.life -= dt; return f.life > 0; });

        setHud({
          hp: Math.max(0, Math.round(s.hp)), maxHp: s.maxHp, level: s.level, exp: Math.round(s.exp),
          need: expForLevel(s.level), kills: s.kills, rune: s.gainedRune, xp: s.gainedXp,
          bossHp: s.mobs.find((m) => m.boss)?.hp || 0,
          bossMax: s.mobs.find((m) => m.boss)?.maxHp || 0,
          bossName: (s.mobs.find((m) => m.boss)?.def.name) || "",
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
      const scale = 1 + (s.floor - 1) * 0.18;
      gainXp(Math.round(m.def.xp * scale));
      s.gainedRune += Math.round(m.def.rune * scale);
      pushFx(m.x, m.y, m.def.color, m.boss ? "BOSS SLAIN" : undefined, m.boss ? 200 : 60);
      if (m.boss) {
        s.bossAlive = false;
        gainXp(expForLevel(s.level) - s.exp); // boss guarantees a level
        s.pickups.push({ x: m.x, y: m.y, kind: "chest", taken: false });
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
    const b = s.biome;

    ctx.fillStyle = "#04070d";
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
          if ((i * 7 + j * 13) % 29 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(x + 12, y + 14, 12, 8);
          }
        } else {
          const openBelow = j + 1 < MAP_H && s.grid[(j + 1) * MAP_W + i] === 0;
          ctx.fillStyle = b.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = b.wallTop;
          ctx.fillRect(x, y, TILE, 10);
          if (openBelow) {
            const grd = ctx.createLinearGradient(0, y + TILE - 22, 0, y + TILE);
            grd.addColorStop(0, "rgba(0,0,0,0)");
            grd.addColorStop(1, b.glow + "33");
            ctx.fillStyle = grd;
            ctx.fillRect(x, y + TILE - 22, TILE, 22);
            if ((i * 3 + j) % 9 === 0) {
              const flick = 0.55 + Math.sin(s.t / 180 + i) * 0.25;
              ctx.globalAlpha = flick;
              ctx.fillStyle = b.glow;
              ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE - 6, 5, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }

    /* exit portal */
    if (s.explored[Math.floor(s.exit.y / TILE) * MAP_W + Math.floor(s.exit.x / TILE)]) {
      const pulse = 26 + Math.sin(s.t / 220) * 5;
      ctx.globalAlpha = s.bossAlive ? 0.3 : 0.9;
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.exit.x, s.exit.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "26px serif"; ctx.textAlign = "center";
      ctx.fillText("🌀", s.exit.x, s.exit.y + 9);
      ctx.globalAlpha = 1;
    }

    /* pickups */
    s.pickups.forEach((p) => {
      if (p.taken) return;
      const idx = Math.floor(p.y / TILE) * MAP_W + Math.floor(p.x / TILE);
      if (!s.explored[idx]) return;
      const bob = Math.sin(s.t / 260 + p.x) * 4;
      ctx.font = "26px serif"; ctx.textAlign = "center";
      ctx.fillText(p.kind === "potion" ? "🧪" : p.kind === "chest" ? "🧰" : "🔷", p.x, p.y + bob);
    });

    /* mobs */
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

    /* shots */
    s.shots.forEach((p) => {
      ctx.shadowColor = p.color; ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    /* player */
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

    /* fx */
    s.fx.forEach((f) => {
      const a = f.life / f.max;
      ctx.globalAlpha = a;
      if (f.r) {
        ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.15 - a), 0, Math.PI * 2); ctx.stroke();
      }
      if (f.text) {
        ctx.fillStyle = f.color;
        ctx.font = "bold 18px system-ui"; ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y - (1 - a) * 26);
      }
      ctx.globalAlpha = 1;
    });

    /* vignette / torchlight */
    ctx.restore();
    const light = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, Math.max(W, H) * 0.62);
    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(1, b.fog);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);

    /* minimap */
    const MM = 132, mmx = W - MM - 12, mmy = 12, sc = MM / MAP_W;
    ctx.fillStyle = "rgba(3,8,16,0.8)";
    ctx.fillRect(mmx, mmy, MM, MM);
    ctx.strokeStyle = b.glow + "88"; ctx.strokeRect(mmx + 0.5, mmy + 0.5, MM, MM);
    for (let j = 0; j < MAP_H; j++) for (let i = 0; i < MAP_W; i++) {
      const idx = j * MAP_W + i;
      if (!s.explored[idx] || s.grid[idx] !== 0) continue;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(mmx + i * sc, mmy + j * sc, sc, sc);
    }
    ctx.fillStyle = "#facc15";
    ctx.fillRect(mmx + (s.exit.x / TILE) * sc - 1, mmy + (s.exit.y / TILE) * sc - 1, 4, 4);
    ctx.fillStyle = b.glow;
    ctx.fillRect(mmx + (s.px / TILE) * sc - 1, mmy + (s.py / TILE) * sc - 1, 4, 4);
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "left";
    ctx.fillText(`${b.emoji} ${b.name} · Floor ${s.floor}`, mmx, mmy + MM + 14);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-foreground p-3 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
            <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} Rune Power</div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-300 bg-clip-text text-transparent">🗺️ CsB LEVEL DUNGEON</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
              A brand new hand-crafted crawl beneath Bull City. 5 biomes, 7 enemy breeds, a boss every 5th floor.
              Slay for EXP to level your CsB Bull and haul Rune Power back to the surface.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
            {BIOMES.map((b) => (
              <Card key={b.id} className="p-3 bg-slate-900/60 border-slate-700">
                <div className="text-2xl">{b.emoji}</div>
                <div className="font-bold mt-1" style={{ color: b.glow }}>{b.name}</div>
              </Card>
            ))}
          </div>

          {heldBulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls found in your wallet. Register them in NFT Power first.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Select your Bull · highest level first</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...heldBulls].sort((a, b) => (b.level || 1) - (a.level || 1)).map((b, i) => (
                  <Card key={b.nft_id} onClick={() => startRun(b)}
                    className="p-3 bg-gradient-to-br from-indigo-800/70 to-slate-900 border-2 border-cyan-400/30 cursor-pointer hover:scale-[1.03] hover:border-cyan-300 transition-all">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-cyan-300/20">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-80">Lv {b.level} · {Math.round(120 + (b.level || 1) * 14)} HP</div>
                    <Button size="sm" className="w-full mt-2"><Swords className="w-3 h-3 mr-1" /> Descend</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-foreground p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center bg-slate-900/80 border-slate-700 space-y-3">
          <div className="text-5xl">{phase === "dead" ? "☠️" : "🏆"}</div>
          <h2 className="text-2xl font-black">{phase === "dead" ? "Fallen in the Dungeon" : "Escaped with the Loot"}</h2>
          <p className="text-sm text-muted-foreground">{phase === "dead" ? "Half your haul was lost in the dark." : "Full rewards secured."}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded bg-black/30"><div className="text-amber-300 font-bold text-lg">+{runSummary.rune}</div>Rune Power</div>
            <div className="p-3 rounded bg-black/30"><div className="text-violet-300 font-bold text-lg">+{runSummary.xp}</div>EXP</div>
            <div className="p-3 rounded bg-black/30"><div className="font-bold text-lg">{runSummary.kills}</div>Kills</div>
            <div className="p-3 rounded bg-black/30"><div className="font-bold text-lg">{runSummary.floors}</div>Floors</div>
          </div>
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
  const nearExit = true;
  return (
    <div className="fixed inset-0 bg-black text-foreground select-none">
      <canvas ref={canvasRef} className="w-full h-full block"
        onMouseDown={() => { g.current.attackReq = true; }} />

      {/* top HUD */}
      <div className="absolute top-2 left-2 right-2 pointer-events-none">
        <Card className="p-2 bg-slate-950/80 border-cyan-500/30 backdrop-blur max-w-xs pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-black/50 ring-1 ring-cyan-400/40 flex items-center justify-center">
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
            <span>🗺️ Floor {floor}</span>
            <span>⚔️ {hud.kills}</span>
            <span className="text-violet-300">+{hud.xp} EXP</span>
            <span className="text-amber-300">+{hud.rune} RUNE</span>
          </div>
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


      {/* controls */}
      <div className="absolute bottom-4 left-4">
        <div ref={joyRef}
          className="w-32 h-32 rounded-full bg-slate-900/50 border-2 border-cyan-400/40 relative touch-none"
          onTouchStart={joyMove} onTouchMove={joyMove} onTouchEnd={joyEnd}
          onMouseDown={joyMove} onMouseMove={(e) => g.current.joy.active && joyMove(e)} onMouseUp={joyEnd} onMouseLeave={joyEnd}>
          <div className="absolute w-14 h-14 rounded-full bg-cyan-400/40 border border-cyan-200/60 top-1/2 left-1/2"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-amber-400/60 text-amber-300"
            onClick={() => { g.current.dashReq = true; }}><Zap className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="border-rose-400/60 text-rose-300"
            onClick={() => { g.current.slamReq = true; }}><Shield className="w-4 h-4" /></Button>
        </div>
        <Button className="w-20 h-20 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black text-2xl shadow-[0_0_25px_rgba(34,211,238,0.6)]"
          onTouchStart={(e) => { e.preventDefault(); g.current.attackReq = true; }}
          onClick={() => { g.current.attackReq = true; }}>⚔️</Button>
        <Button size="sm" variant="secondary" onClick={tryInteract}>DESCEND</Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => endRun(false)}>Escape & Bank</Button>
      </div>
    </div>
  );
}
