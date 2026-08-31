import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Swords, Heart, Sparkles, Shield, Zap, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";

/* =======================================================================
   CsB ASCENSION — SKY CITADEL
   A wave-based arena action-roguelite. Distinct from the grid crawlers:
   open circular arenas, gear loot with affixes, boon drafts on level up,
   3-hit melee combos, dodge i-frames, an ultimate meter and elite modifiers.
   ======================================================================= */

const ARENA_R = 980;

type Ring = { id: string; name: string; emoji: string; sky1: string; sky2: string; floor: string; floor2: string; glow: string };

const RINGS: Ring[] = [
  { id: "dawn", name: "Dawn Terrace", emoji: "🌅", sky1: "#0b1224", sky2: "#1a2b52", floor: "#16233d", floor2: "#1d2f52", glow: "#7dd3fc" },
  { id: "storm", name: "Storm Gallery", emoji: "🌩️", sky1: "#07101c", sky2: "#123044", floor: "#0f2230", floor2: "#153042", glow: "#22d3ee" },
  { id: "forge", name: "Sunforge Span", emoji: "🔥", sky1: "#1b0c07", sky2: "#3d1a0c", floor: "#2a1610", floor2: "#361d14", glow: "#fb923c" },
  { id: "aether", name: "Aether Spire", emoji: "🔮", sky1: "#120a24", sky2: "#2a1750", floor: "#1e1636", floor2: "#281c47", glow: "#c084fc" },
  { id: "crown", name: "Crown Vault", emoji: "👑", sky1: "#05140f", sky2: "#0d3a2c", floor: "#0d2620", floor2: "#12332a", glow: "#34d399" },
];

/* ------------------------------- enemies -------------------------------- */

type Kind = "charger" | "ranger" | "orbiter" | "bomber" | "splitter";
type EnemyDef = { id: string; name: string; emoji: string; kind: Kind; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string; radius: number };

const ENEMIES: EnemyDef[] = [
  { id: "skyrat", name: "Sky Wisp", emoji: "🪽", kind: "charger", hp: 30, dmg: 6, speed: 1.9, xp: 12, rune: 4, color: "#93c5fd", radius: 15 },
  { id: "lancer", name: "Aether Lancer", emoji: "🗡️", kind: "charger", hp: 64, dmg: 12, speed: 1.6, xp: 24, rune: 8, color: "#f0abfc", radius: 18 },
  { id: "seer", name: "Storm Seer", emoji: "🧿", kind: "ranger", hp: 52, dmg: 11, speed: 1.1, xp: 26, rune: 9, color: "#67e8f9", radius: 17 },
  { id: "warden", name: "Gale Warden", emoji: "🛡️", kind: "orbiter", hp: 96, dmg: 15, speed: 1.35, xp: 34, rune: 12, color: "#fbbf24", radius: 20 },
  { id: "cinder", name: "Cinder Mote", emoji: "💥", kind: "bomber", hp: 40, dmg: 22, speed: 2.1, xp: 30, rune: 11, color: "#fb7185", radius: 16 },
  { id: "hollow", name: "Hollow Twin", emoji: "🌀", kind: "splitter", hp: 110, dmg: 14, speed: 1.25, xp: 40, rune: 15, color: "#a78bfa", radius: 22 },
  { id: "colossus", name: "Sky Colossus", emoji: "🗿", kind: "charger", hp: 190, dmg: 20, speed: 0.95, xp: 58, rune: 22, color: "#94a3b8", radius: 27 },
];

type BossDef = { id: string; name: string; emoji: string; hp: number; dmg: number; speed: number; xp: number; rune: number; color: string };

const BOSSES: BossDef[] = [
  { id: "herald", name: "Dawn Herald", emoji: "🌅", hp: 900, dmg: 24, speed: 1.1, xp: 420, rune: 200, color: "#7dd3fc" },
  { id: "tempest", name: "Tempest Choir", emoji: "🌩️", hp: 1400, dmg: 30, speed: 1.2, xp: 620, rune: 300, color: "#22d3ee" },
  { id: "smith", name: "Sunforge Smith", emoji: "🔨", hp: 2000, dmg: 36, speed: 1.15, xp: 880, rune: 430, color: "#fb923c" },
  { id: "archon", name: "Aether Archon", emoji: "🔮", hp: 2800, dmg: 42, speed: 1.25, xp: 1200, rune: 600, color: "#c084fc" },
  { id: "crownbull", name: "THE CROWNED BULL", emoji: "👑", hp: 4200, dmg: 50, speed: 1.3, xp: 1900, rune: 950, color: "#34d399" },
];

/* --------------------------- elite affixes ------------------------------ */

type Affix = { id: string; label: string; color: string };
const AFFIXES: Affix[] = [
  { id: "shielded", label: "Shielded", color: "#38bdf8" },
  { id: "frenzied", label: "Frenzied", color: "#f43f5e" },
  { id: "volatile", label: "Volatile", color: "#f59e0b" },
  { id: "leeching", label: "Leeching", color: "#a3e635" },
];

/* -------------------------------- gear ---------------------------------- */

type Slot = "horn" | "hide" | "relic";
type Rarity = "common" | "rare" | "epic" | "legendary";
type Gear = { slot: Slot; name: string; rarity: Rarity; atk: number; hp: number; crit: number; spd: number };

const RARITY_COLOR: Record<Rarity, string> = { common: "#cbd5e1", rare: "#38bdf8", epic: "#c084fc", legendary: "#fbbf24" };
const RARITY_WEIGHT: Rarity[] = ["common", "common", "common", "rare", "rare", "epic", "legendary"];
const GEAR_NAMES: Record<Slot, string[]> = {
  horn: ["Gilded Horn", "Stormcut Horn", "Ashen Tusk", "Aether Spike", "Crown Gore"],
  hide: ["Woven Hide", "Plated Barding", "Emberweave", "Runed Caparison", "Aegis Pelt"],
  relic: ["Epoch Charm", "Ouroboros Coil", "Stake Sigil", "Hydra Shard", "Voltaire Seal"],
};

function rollGear(power: number): Gear {
  const slot: Slot = (["horn", "hide", "relic"] as Slot[])[Math.floor(Math.random() * 3)];
  const rarity = RARITY_WEIGHT[Math.floor(Math.random() * RARITY_WEIGHT.length)];
  const rm = { common: 1, rare: 1.5, epic: 2.1, legendary: 3 }[rarity];
  const base = 2 + power * 0.9;
  return {
    slot, rarity,
    name: GEAR_NAMES[slot][Math.floor(Math.random() * GEAR_NAMES[slot].length)],
    atk: slot === "horn" ? Math.round(base * rm) : Math.round(base * rm * 0.35),
    hp: slot === "hide" ? Math.round(base * rm * 5) : Math.round(base * rm * 1.6),
    crit: slot === "relic" ? Math.round(3 * rm) : Math.round(rm),
    spd: slot === "relic" ? +(0.04 * rm).toFixed(2) : 0,
  };
}
const gearScore = (gr: Gear | null) => (gr ? gr.atk * 3 + gr.hp * 0.6 + gr.crit * 4 + gr.spd * 60 : 0);

/* -------------------------------- boons --------------------------------- */

type Boon = { id: string; emoji: string; name: string; desc: string };
const BOONS: Boon[] = [
  { id: "fury", emoji: "⚔️", name: "Bull Fury", desc: "+18% attack damage" },
  { id: "vigor", emoji: "❤️", name: "Iron Vigor", desc: "+22% max HP and heal to full" },
  { id: "swift", emoji: "💨", name: "Swiftstep", desc: "+12% move speed, dodge cooldown -20%" },
  { id: "crit", emoji: "🎯", name: "Precision", desc: "+10% crit chance" },
  { id: "leech", emoji: "🩸", name: "Bloodroot", desc: "Heal 6% of damage dealt" },
  { id: "arc", emoji: "⚡", name: "Arc Chain", desc: "Attacks chain lightning to a nearby foe" },
  { id: "thorn", emoji: "🌵", name: "Thornhide", desc: "Reflect 35% of damage taken" },
  { id: "greed", emoji: "💰", name: "Epoch Greed", desc: "+25% Rune Power from kills" },
  { id: "nova", emoji: "🌟", name: "Nova Well", desc: "Ultimate charges 40% faster" },
  { id: "wide", emoji: "🌪️", name: "Wide Sweep", desc: "+35% attack range" },
];

const RARITY_MULT: Record<string, number> = { common: 1, rare: 1.15, epic: 1.3, legendary: 1.5 };
export function expForLevel(level: number) { return 80 + level * 40; }

/* ------------------------------- entities -------------------------------- */

interface Mob {
  id: number; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number;
  def: EnemyDef | BossDef; boss: boolean; cd: number; hit: number; affix?: Affix;
  ang: number; charge: number; small?: boolean;
}
interface Shot { x: number; y: number; vx: number; vy: number; life: number; dmg: number; friendly: boolean; color: string; r: number }
interface Orb { x: number; y: number; kind: "heal" | "rune" | "gear"; taken: boolean; bob: number }
interface Fx { x: number; y: number; life: number; max: number; text?: string; color: string; r?: number; vy?: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Pillar { x: number; y: number; r: number }

export default function CsbAscension() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { userId } = useCsbv1();
  const heldBulls = useHeldCsbBulls(userId, walletNfts as any);

  const [phase, setPhase] = useState<"select" | "playing" | "dead" | "cleared">("select");
  const [bull, setBull] = useState<HeldCsbBull | null>(null);
  const [hud, setHud] = useState({
    hp: 100, maxHp: 100, level: 1, exp: 0, need: 120, kills: 0, rune: 0, xp: 0,
    ring: 1, ringName: RINGS[0].name, ringEmoji: RINGS[0].emoji, wave: 1, waves: 3, left: 0,
    combo: 0, ult: 0, bossHp: 0, bossMax: 0, bossName: "",
  });
  const [gear, setGear] = useState<Record<Slot, Gear | null>>({ horn: null, hide: null, relic: null });
  const [boonPick, setBoonPick] = useState<Boon[] | null>(null);
  const [ownedBoons, setOwnedBoons] = useState<Boon[]>([]);
  const [summary, setSummary] = useState({ rune: 0, xp: 0, kills: 0, ring: 1, levels: 0, best: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bullImgRef = useRef<HTMLImageElement | null>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const g = useRef({
    ring: 1, wave: 1, waves: 3, pillars: [] as Pillar[],
    px: 0, py: 0, aimX: 1, aimY: 0, facing: 1,
    hp: 120, maxHp: 120, atk: 14, def: 2, crit: 8, critMult: 1.9, spdMult: 1, leech: 0, thorn: 0,
    greed: 1, ultRate: 1, range: 1, arc: false,
    atkCd: 0, dashCd: 0, dashMax: 1800, invul: 0, ult: 0, comboStep: 0, comboTimer: 0,
    combo: 0, comboDecay: 0, hitStop: 0, shake: 0,
    vx: 0, vy: 0, dashT: 0, dashVX: 0, dashVY: 0, lastTrail: 0,
    trail: [] as { x: number; y: number; life: number; max: number }[],
    atkAnim: 0, atkAnimMax: 1, atkAng: 0, atkArc: 0, atkReach: 0, atkFinisher: false,
    atkBuf: 0, dashBuf: 0, ultBuf: 0, hudT: 0, walkT: 0,

    level: 1, exp: 0, gainedXp: 0, gainedRune: 0, bankedXp: 0, bankedRune: 0, kills: 0, levelUps: 0, bestCombo: 0,
    mobs: [] as Mob[], shots: [] as Shot[], orbs: [] as Orb[], fx: [] as Fx[], parts: [] as Particle[],
    nextId: 1, keys: {} as Record<string, boolean>, joy: { active: false, dx: 0, dy: 0 },
    running: false, paused: false, t: 0, camX: 0, camY: 0,
    attackReq: false, dashReq: false, ultReq: false, bossAlive: false, gearRef: { horn: null, hide: null, relic: null } as Record<Slot, Gear | null>,
  });

  /* load bull artwork */
  useEffect(() => {
    if (!bull?.image) { bullImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bull.image;
    img.onload = () => { bullImgRef.current = img; };
  }, [bull?.image]);

  const ringDef = () => RINGS[(g.current.ring - 1) % RINGS.length];

  const pushFx = (x: number, y: number, color: string, text?: string, r?: number) => {
    g.current.fx.push({ x, y, life: 620, max: 620, color, text, r, vy: text ? -0.045 : 0 });
  };
  const burst = (x: number, y: number, color: string, n = 12, power = 0.35) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = power * (0.4 + Math.random());
      g.current.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 520, max: 520, color, size: 2 + Math.random() * 3 });
    }
  };

  /* ------------------------------ arena build --------------------------- */
  const buildRing = useCallback((r: number, wave: number) => {
    const s = g.current;
    s.ring = r; s.wave = wave;
    s.waves = 3;
    if (wave === 1) {
      s.pillars = [];
      const count = 5 + Math.min(7, r);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, d = 220 + Math.random() * (ARENA_R - 380);
        s.pillars.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 40 + Math.random() * 45 });
      }
      s.px = 0; s.py = 0;
    }
    s.mobs = []; s.shots = []; s.fx = []; s.parts = [];
    s.bossAlive = false;

    const isBossWave = wave > s.waves;
    if (isBossWave) {
      const bd = BOSSES[Math.min(BOSSES.length - 1, Math.floor((r - 1) % BOSSES.length))];
      const scale = 1 + (r - 1) * 0.35 + (s.level - 1) * 0.05;
      s.mobs.push({
        id: s.nextId++, x: 0, y: -420, vx: 0, vy: 0, ang: 0, charge: 0,
        hp: Math.round(bd.hp * scale), maxHp: Math.round(bd.hp * scale), def: bd, boss: true, cd: 0, hit: 0,
      });
      s.bossAlive = true;
      return;
    }

    const poolSize = Math.min(ENEMIES.length, 2 + Math.floor(r * 1.2));
    const pool = ENEMIES.slice(0, poolSize);
    const count = 6 + r * 2 + wave * 2;
    const scale = 1 + (r - 1) * 0.3 + (wave - 1) * 0.1 + (s.level - 1) * 0.05;
    for (let i = 0; i < count; i++) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const a = Math.random() * Math.PI * 2, d = 420 + Math.random() * (ARENA_R - 480);
      const elite = Math.random() < 0.12 + r * 0.02;
      const affix = elite ? AFFIXES[Math.floor(Math.random() * AFFIXES.length)] : undefined;
      const hp = Math.round(def.hp * scale * (elite ? 2.4 : 1));
      s.mobs.push({ id: s.nextId++, x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, ang: a, charge: 0, hp, maxHp: hp, def, boss: false, cd: 0, hit: 0, affix });
    }
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
    } catch (e) { console.error("ascension persist failed", e); }
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
    setSummary({ rune: rune + s.bankedRune, xp: xp + s.bankedXp, kills: s.kills, ring: s.ring, levels: s.levelUps, best: s.bestCombo });
    setPhase(died ? "dead" : "cleared");
    persist(rune, xp, s.level, s.exp);
    if (userId) {
      supabase.from("game_results").insert({
        user_id: userId, game_name: "CsB Ascension", result: died ? "loss" : "win", diamonds_won: 0,
      } as any).then(() => {});
    }
    toast({
      title: died ? "☠️ Your Bull fell from the Citadel" : "👑 Ascension banked",
      description: `+${rune + s.bankedRune} Rune Power · +${xp + s.bankedXp} EXP`,
    });
  }, [persist, toast, userId]);

  /* ------------------------------ progression --------------------------- */
  const offerBoons = () => {
    const pool = [...BOONS].sort(() => Math.random() - 0.5).slice(0, 3);
    g.current.paused = true;
    setBoonPick(pool);
  };

  const applyBoon = (b: Boon) => {
    const s = g.current;
    switch (b.id) {
      case "fury": s.atk = Math.round(s.atk * 1.18); break;
      case "vigor": s.maxHp = Math.round(s.maxHp * 1.22); s.hp = s.maxHp; break;
      case "swift": s.spdMult *= 1.12; s.dashMax *= 0.8; break;
      case "crit": s.crit += 10; break;
      case "leech": s.leech += 0.06; break;
      case "arc": s.arc = true; break;
      case "thorn": s.thorn += 0.35; break;
      case "greed": s.greed += 0.25; break;
      case "nova": s.ultRate *= 1.4; break;
      case "wide": s.range *= 1.35; break;
    }
    setOwnedBoons((p) => [...p, b]);
    setBoonPick(null);
    s.paused = false;
    pushFx(s.px, s.py - 40, "#fbbf24", `${b.emoji} ${b.name}`);
  };

  const gainXp = (amount: number) => {
    const s = g.current;
    s.exp += amount; s.gainedXp += amount;
    let leveled = false;
    while (s.exp >= expForLevel(s.level)) {
      s.exp -= expForLevel(s.level);
      s.level += 1; s.levelUps += 1; leveled = true;
      s.maxHp = Math.round(s.maxHp * 1.08) + 12;
      s.hp = s.maxHp;
      s.atk = Math.round(s.atk * 1.06) + 2;
      pushFx(s.px, s.py - 60, "#fbbf24", `LEVEL ${s.level}!`, 120);
      burst(s.px, s.py, "#fbbf24", 26, 0.55);
    }
    if (leveled) offerBoons();
  };

  const equipGear = (gr: Gear) => {
    const s = g.current;
    const cur = s.gearRef[gr.slot];
    if (gearScore(gr) <= gearScore(cur)) {
      const r = 20 + s.level * 5;
      s.gainedRune += Math.round(r * s.greed);
      pushFx(s.px, s.py - 40, "#94a3b8", `SALVAGED +${Math.round(r * s.greed)}`);
      return;
    }
    if (cur) { s.maxHp -= cur.hp; s.atk -= cur.atk; s.crit -= cur.crit; s.spdMult -= cur.spd; }
    s.gearRef[gr.slot] = gr;
    s.maxHp += gr.hp; s.atk += gr.atk; s.crit += gr.crit; s.spdMult += gr.spd;
    s.hp = Math.min(s.maxHp, s.hp + gr.hp);
    setGear({ ...s.gearRef });
    pushFx(s.px, s.py - 40, RARITY_COLOR[gr.rarity], `${gr.rarity.toUpperCase()} ${gr.name}`);
    burst(s.px, s.py, RARITY_COLOR[gr.rarity], 20, 0.4);
  };

  /* --------------------------------- combat ------------------------------ */
  const killMob = (m: Mob) => {
    const s = g.current;
    const eliteMult = m.affix ? 2.2 : 1;
    const rune = Math.round(m.def.rune * (1 + (s.ring - 1) * 0.4) * eliteMult * s.greed * (1 + s.combo * 0.02));
    const xp = Math.round(m.def.xp * (1 + (s.ring - 1) * 0.35) * eliteMult * 2.2);
    s.gainedRune += rune;
    s.kills += 1;
    burst(m.x, m.y, m.def.color, m.boss ? 60 : 16, m.boss ? 0.8 : 0.4);
    pushFx(m.x, m.y - 18, "#fbbf24", `+${rune}`);
    gainXp(xp);

    if (m.boss) {
      s.shake = 26;
      pushFx(m.x, m.y, m.def.color, `${m.def.emoji} ${m.def.name} DEFEATED`, 300);
      for (let i = 0; i < 3; i++) s.orbs.push({ x: m.x + (i - 1) * 70, y: m.y, kind: "gear", taken: false, bob: Math.random() * 6 });
    } else {
      if (m.affix) s.orbs.push({ x: m.x, y: m.y, kind: "gear", taken: false, bob: Math.random() * 6 });
      else if (Math.random() < 0.14) s.orbs.push({ x: m.x, y: m.y, kind: "heal", taken: false, bob: Math.random() * 6 });
      else if (Math.random() < 0.16) s.orbs.push({ x: m.x, y: m.y, kind: "rune", taken: false, bob: Math.random() * 6 });
      if ((m.def as EnemyDef).kind === "splitter" && !m.small) {
        for (let i = 0; i < 2; i++) {
          const hp = Math.round(m.maxHp * 0.32);
          s.mobs.push({ id: s.nextId++, x: m.x + (i ? 40 : -40), y: m.y, vx: 0, vy: 0, ang: 0, charge: 0, hp, maxHp: hp, def: m.def as EnemyDef, boss: false, cd: 0, hit: 0, small: true });
        }
      }
      if ((m.def as EnemyDef).kind === "bomber" || m.affix?.id === "volatile") {
        s.shots.push({ x: m.x, y: m.y, vx: 0, vy: 0, life: 1, dmg: 0, friendly: false, color: "#f59e0b", r: 0 });
        pushFx(m.x, m.y, "#f59e0b", undefined, 150);
        if (Math.hypot(s.px - m.x, s.py - m.y) < 150 && s.invul <= 0) hitPlayer(m.def.dmg * 0.8);
      }
    }
  };

  const damageMob = (m: Mob, raw: number, source: "melee" | "ult" | "arc" = "melee") => {
    const s = g.current;
    const isCrit = Math.random() * 100 < s.crit;
    let dmg = raw * (isCrit ? s.critMult : 1);
    if (m.affix?.id === "shielded") dmg *= 0.6;
    dmg = Math.max(1, Math.round(dmg));
    m.hp -= dmg;
    m.hit = 200;
    s.hitStop = Math.max(s.hitStop, source === "ult" ? 70 : isCrit ? 46 : 24);
    s.shake = Math.max(s.shake, isCrit ? 11 : 5);
    // impact sparks fly away from the player
    const d = Math.hypot(m.x - s.px, m.y - s.py) || 1;
    const ux = (m.x - s.px) / d, uy = (m.y - s.py) / d;
    if (!m.boss) { m.vx += ux * (isCrit ? 2.6 : 1.5); m.vy += uy * (isCrit ? 2.6 : 1.5); }
    for (let i = 0; i < (isCrit ? 12 : 7); i++) {
      const a = Math.atan2(uy, ux) + (Math.random() - 0.5) * 1.5, sp = 0.25 + Math.random() * 0.45;
      s.parts.push({ x: m.x - ux * 10, y: m.y - uy * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 400, max: 400, color: isCrit ? "#fbbf24" : "#ffffff", size: 2 + Math.random() * 2.5 });
    }
    s.fx.push({ x: m.x + (Math.random() * 18 - 9), y: m.y - 24, life: isCrit ? 760 : 560, max: isCrit ? 760 : 560, color: isCrit ? "#fbbf24" : "#ffffff", text: `${dmg}${isCrit ? "!" : ""}`, vy: -0.055 });
    pushFx(m.x, m.y, isCrit ? "#fbbf24" : "#e2e8f0", undefined, isCrit ? 54 : 34);
    if (s.leech > 0) s.hp = Math.min(s.maxHp, s.hp + dmg * s.leech);
    s.combo += 1; s.comboDecay = 2400;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    s.ult = Math.min(100, s.ult + dmg * 0.05 * s.ultRate);
    if (m.hp <= 0) { killMob(m); s.mobs = s.mobs.filter((x) => x !== m); }
  };


  const hitPlayer = (raw: number) => {
    const s = g.current;
    if (s.invul > 0) return;
    const dmg = Math.max(1, Math.round(raw - s.def));
    s.hp -= dmg;
    s.invul = 460;
    s.combo = 0;
    s.shake = Math.max(s.shake, 16);
    s.hitStop = Math.max(s.hitStop, 40);
    burst(s.px, s.py, "#f43f5e", 14, 0.4);
    s.fx.push({ x: s.px, y: s.py - 40, life: 700, max: 700, color: "#f43f5e", text: `-${dmg}`, vy: -0.05 });
    pushFx(s.px, s.py, "#f43f5e", undefined, 70);
    if (s.thorn > 0) {
      s.mobs.forEach((m) => { if (Math.hypot(m.x - s.px, m.y - s.py) < 200) damageMob(m, dmg * s.thorn); });
    }
    if (s.hp <= 0) { s.hp = 0; endRun(true); }
  };


  /* -------------------------------- start -------------------------------- */
  const startRun = (b: HeldCsbBull) => {
    const s = g.current;
    const rare = RARITY_MULT[b.rarity] || 1;
    s.level = b.level || 1;
    s.exp = (b as any).exp || 0;
    s.maxHp = Math.round((130 + s.level * 15) * rare);
    s.hp = s.maxHp;
    s.atk = Math.round((13 + s.level * 2.4) * rare);
    s.def = Math.round(1 + s.level * 0.5);
    s.crit = 8; s.critMult = 1.9; s.spdMult = 1; s.leech = 0; s.thorn = 0;
    s.greed = 1; s.ultRate = 1; s.range = 1; s.arc = false;
    s.gainedRune = 0; s.gainedXp = 0; s.bankedRune = 0; s.bankedXp = 0;
    s.kills = 0; s.levelUps = 0; s.combo = 0; s.bestCombo = 0; s.ult = 0;
    s.atkCd = 0; s.dashCd = 0; s.dashMax = 1800; s.invul = 0; s.comboStep = 0;
    s.orbs = []; s.gearRef = { horn: null, hide: null, relic: null };
    s.paused = false;
    setGear({ horn: null, hide: null, relic: null });
    setOwnedBoons([]);
    setBoonPick(null);
    setBull(b);
    buildRing(1, 1);
    s.running = true;
    setPhase("playing");
  };

  /* -------------------------------- input -------------------------------- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      g.current.keys[k] = true;
      if (k === " " || k === "j") { e.preventDefault(); g.current.attackReq = true; }
      if (k === "shift" || k === "k") g.current.dashReq = true;
      if (k === "q" || k === "l") g.current.ultReq = true;
    };
    const up = (e: KeyboardEvent) => { g.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const joyMove = (e: React.TouchEvent | React.MouseEvent) => {
    const el = joyRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p: any = "touches" in e ? (e as React.TouchEvent).touches[0] : e;
    if (!p) return;
    let dx = p.clientX - (r.left + r.width / 2);
    let dy = p.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy), max = r.width / 2;
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    setKnob({ x: dx, y: dy });
    g.current.joy = { active: true, dx: dx / max, dy: dy / max };
  };
  const joyEnd = () => { setKnob({ x: 0, y: 0 }); g.current.joy = { active: false, dx: 0, dy: 0 }; };

  /* ------------------------------- game loop ----------------------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0, last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const collide = (x: number, y: number) => {
      const s = g.current;
      if (Math.hypot(x, y) > ARENA_R - 26) return false;
      for (const p of s.pillars) if (Math.hypot(x - p.x, y - p.y) < p.r + 20) return false;
      return true;
    };

    const advance = () => {
      const s = g.current;
      // wave / ring progression
      if (s.wave > s.waves) {
        // boss cleared -> next ring
        s.ring += 1;
        bankProgress();
        s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.4));
        pushFx(s.px, s.py - 70, "#fbbf24", `RING ${s.ring} · ${RINGS[(s.ring - 1) % RINGS.length].name}`, 220);
        buildRing(s.ring, 1);
        offerBoons();
      } else {
        s.wave += 1;
        pushFx(s.px, s.py - 60, "#7dd3fc", s.wave > s.waves ? "BOSS INCOMING" : `WAVE ${s.wave}`, 180);
        buildRing(s.ring, s.wave);
      }
    };

    const loop = (now: number) => {
      const rawDt = Math.min(40, now - last); last = now;
      const s = g.current;
      let dt = rawDt;
      if (s.hitStop > 0) { s.hitStop -= rawDt; dt = rawDt * 0.25; }
      s.t += dt;

      if (s.running && !s.paused) {
        /* ---- movement ---- */
        let dx = 0, dy = 0;
        if (s.keys["w"] || s.keys["arrowup"]) dy -= 1;
        if (s.keys["s"] || s.keys["arrowdown"]) dy += 1;
        if (s.keys["a"] || s.keys["arrowleft"]) dx -= 1;
        if (s.keys["d"] || s.keys["arrowright"]) dx += 1;
        if (s.joy.active) { dx += s.joy.dx; dy += s.joy.dy; }
        const mag = Math.hypot(dx, dy);
        if (mag > 0.08) {
          dx /= mag; dy /= mag;
          s.aimX = dx; s.aimY = dy;
          s.facing = dx !== 0 ? (dx > 0 ? 1 : -1) : s.facing;
          const sp = 0.34 * dt * s.spdMult;
          if (collide(s.px + dx * sp, s.py)) s.px += dx * sp;
          if (collide(s.px, s.py + dy * sp)) s.py += dy * sp;
        }

        s.atkCd -= dt; s.dashCd -= dt; s.invul -= dt; s.comboTimer -= dt;
        s.comboDecay -= dt;
        if (s.comboDecay <= 0 && s.combo > 0) s.combo = 0;
        if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 0.05);

        /* ---- melee combo ---- */
        if (s.attackReq && s.atkCd <= 0) {
          s.comboStep = s.comboTimer > 0 ? (s.comboStep + 1) % 3 : 0;
          s.comboTimer = 900;
          const finisher = s.comboStep === 2;
          s.atkCd = finisher ? 520 : 300;
          const reach = (finisher ? 300 : 230) * s.range;
          const arcW = finisher ? Math.PI * 2 : Math.PI * 0.95;
          const baseAng = Math.atan2(s.aimY, s.aimX);
          pushFx(s.px, s.py, ringDef().glow, undefined, reach);
          const hits: Mob[] = [];
          s.mobs.forEach((m) => {
            const d = Math.hypot(m.x - s.px, m.y - s.py);
            if (d > reach) return;
            if (!finisher) {
              let a = Math.atan2(m.y - s.py, m.x - s.px) - baseAng;
              while (a > Math.PI) a -= Math.PI * 2;
              while (a < -Math.PI) a += Math.PI * 2;
              if (Math.abs(a) > arcW / 2) return;
            }
            hits.push(m);
          });
          hits.forEach((m) => {
            damageMob(m, s.atk * (finisher ? 2.2 : 1) * (0.9 + Math.random() * 0.3));
            if (finisher) {
              const d = Math.hypot(m.x - s.px, m.y - s.py) || 1;
              m.vx += ((m.x - s.px) / d) * 3.4; m.vy += ((m.y - s.py) / d) * 3.4;
            }
          });
          if (s.arc && hits.length) {
            const near = s.mobs.filter((m) => !hits.includes(m)).sort((a, b) => Math.hypot(a.x - s.px, a.y - s.py) - Math.hypot(b.x - s.px, b.y - s.py))[0];
            if (near) { damageMob(near, s.atk * 0.7, "arc"); pushFx(near.x, near.y, "#67e8f9", undefined, 60); }
          }
          if (finisher) s.shake = Math.max(s.shake, 16);
        }
        s.attackReq = false;

        /* ---- dodge ---- */
        if (s.dashReq && s.dashCd <= 0) {
          s.dashCd = s.dashMax; s.invul = 520;
          for (let i = 0; i < 20; i++) {
            const nx = s.px + s.aimX * 16, ny = s.py + s.aimY * 16;
            if (collide(nx, ny)) { s.px = nx; s.py = ny; burst(s.px, s.py, ringDef().glow, 2, 0.15); } else break;
          }
        }
        s.dashReq = false;

        /* ---- ultimate ---- */
        if (s.ultReq && s.ult >= 100) {
          s.ult = 0; s.invul = Math.max(s.invul, 700); s.shake = 30;
          pushFx(s.px, s.py, "#fbbf24", "BULL NOVA", 900);
          burst(s.px, s.py, "#fbbf24", 70, 0.9);
          [...s.mobs].forEach((m) => { if (Math.hypot(m.x - s.px, m.y - s.py) < 900) damageMob(m, s.atk * 4.5, "ult"); });
          s.shots = s.shots.filter((p) => p.friendly);
        }
        s.ultReq = false;

        /* ---- enemies ---- */
        s.mobs.forEach((m) => {
          const d = Math.hypot(s.px - m.x, s.py - m.y) || 1;
          const ux = (s.px - m.x) / d, uy = (s.py - m.y) / d;
          m.hit = Math.max(0, m.hit - dt);
          m.cd -= dt;
          const frenzy = m.affix?.id === "frenzied" ? 1.5 : 1;
          const kind: Kind = m.boss ? "charger" : (m.def as EnemyDef).kind;
          const spd = m.def.speed * frenzy * dt * 0.16;

          if (kind === "ranger") {
            if (d < 300) { m.vx -= ux * spd * 0.5; m.vy -= uy * spd * 0.5; }
            else if (d > 460) { m.vx += ux * spd * 0.5; m.vy += uy * spd * 0.5; }
            if (m.cd <= 0 && d < 700) {
              m.cd = 1500 / frenzy;
              s.shots.push({ x: m.x, y: m.y, vx: ux * 0.5, vy: uy * 0.5, life: 2400, dmg: m.def.dmg, friendly: false, color: m.def.color, r: 8 });
            }
          } else if (kind === "orbiter") {
            m.ang += dt * 0.0016 * frenzy;
            const tx = s.px + Math.cos(m.ang) * 200, ty = s.py + Math.sin(m.ang) * 200;
            const od = Math.hypot(tx - m.x, ty - m.y) || 1;
            m.vx += ((tx - m.x) / od) * spd * 0.6; m.vy += ((ty - m.y) / od) * spd * 0.6;
            if (m.cd <= 0 && d < 520) {
              m.cd = 2000 / frenzy;
              for (let k = -1; k <= 1; k++) {
                const a = Math.atan2(uy, ux) + k * 0.28;
                s.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * 0.42, vy: Math.sin(a) * 0.42, life: 2200, dmg: m.def.dmg * 0.7, friendly: false, color: m.def.color, r: 7 });
              }
            }
          } else if (kind === "bomber") {
            m.vx += ux * spd * 0.9; m.vy += uy * spd * 0.9;
            if (d < 60) { hitPlayer(m.def.dmg); killMob(m); s.mobs = s.mobs.filter((x) => x !== m); return; }
          } else {
            // charger / splitter / boss
            if (m.boss) {
              m.charge -= dt;
              if (m.charge <= 0 && d < 900) {
                m.charge = 3200;
                const ang = Math.atan2(uy, ux);
                for (let k = 0; k < 10; k++) {
                  const a = ang + (k / 10) * Math.PI * 2;
                  s.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * 0.36, vy: Math.sin(a) * 0.36, life: 2600, dmg: m.def.dmg * 0.6, friendly: false, color: m.def.color, r: 10 });
                }
                pushFx(m.x, m.y, m.def.color, undefined, 180);
              }
            }
            if (d > (m.boss ? 90 : 44)) { m.vx += ux * spd * 0.7; m.vy += uy * spd * 0.7; }
            if (m.cd <= 0 && d < (m.boss ? 130 : 66)) {
              m.cd = (m.boss ? 900 : 1050) / frenzy;
              hitPlayer(m.def.dmg * (1 + (s.ring - 1) * 0.12));
              if (m.affix?.id === "leeching") m.hp = Math.min(m.maxHp, m.hp + m.def.dmg * 2);
            }
          }

          m.vx *= 0.86; m.vy *= 0.86;
          const nx = m.x + m.vx * (dt * 0.06) * 6, ny = m.y + m.vy * (dt * 0.06) * 6;
          if (collide(nx, m.y)) m.x = nx; else m.vx *= -0.3;
          if (collide(m.x, ny)) m.y = ny; else m.vy *= -0.3;
        });

        /* ---- shots ---- */
        s.shots = s.shots.filter((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.r === 0) return false;
          if (Math.hypot(p.x, p.y) > ARENA_R) return false;
          if (!p.friendly && Math.hypot(p.x - s.px, p.y - s.py) < 26) { hitPlayer(p.dmg); return false; }
          return p.life > 0;
        });

        /* ---- orbs ---- */
        s.orbs.forEach((o) => {
          if (o.taken) return;
          const d = Math.hypot(o.x - s.px, o.y - s.py);
          if (d < 220) { o.x += (s.px - o.x) * 0.06; o.y += (s.py - o.y) * 0.06; }
          if (d < 44) {
            o.taken = true;
            if (o.kind === "heal") { s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.25)); pushFx(o.x, o.y - 20, "#34d399", "+HP"); }
            else if (o.kind === "rune") { const r = Math.round((40 + s.level * 9) * s.greed); s.gainedRune += r; pushFx(o.x, o.y - 20, "#fbbf24", `+${r} RUNE`); }
            else equipGear(rollGear(s.level + s.ring * 2));
          }
        });
        s.orbs = s.orbs.filter((o) => !o.taken);

        /* ---- wave clear ---- */
        if (s.mobs.length === 0 && s.running) advance();
      }

      /* ---- fx / particles ---- */
      s.fx = s.fx.filter((f) => { f.life -= rawDt; if (f.vy) f.y += f.vy * rawDt; return f.life > 0; });
      s.parts = s.parts.filter((p) => { p.life -= rawDt; p.x += p.vx * rawDt; p.y += p.vy * rawDt; p.vx *= 0.96; p.vy *= 0.96; return p.life > 0; });

      /* ================================ RENDER =============================== */
      const W = cv.clientWidth, H = cv.clientHeight;
      const rd = ringDef();
      s.camX += (s.px - s.camX) * 0.12;
      s.camY += (s.py - s.camY) * 0.12;
      const shakeX = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
      const shakeY = s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0;
      const ox = W / 2 - s.camX + shakeX, oy = H / 2 - s.camY + shakeY;

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, rd.sky1); sky.addColorStop(1, rd.sky2);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // parallax stars
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5 - s.camX * 0.15) % W + W) % W;
        const sy = ((i * 91.7 - s.camY * 0.15) % H + H) % H;
        ctx.fillStyle = i % 5 === 0 ? rd.glow : "#ffffff";
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(ox, oy);

      // arena disc
      ctx.beginPath(); ctx.arc(0, 0, ARENA_R, 0, Math.PI * 2);
      const fg = ctx.createRadialGradient(0, 0, 80, 0, 0, ARENA_R);
      fg.addColorStop(0, rd.floor2); fg.addColorStop(1, rd.floor);
      ctx.fillStyle = fg; ctx.fill();
      ctx.lineWidth = 10; ctx.strokeStyle = rd.glow; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;

      // floor rings + spokes
      ctx.strokeStyle = rd.glow; ctx.globalAlpha = 0.09; ctx.lineWidth = 2;
      for (let r = 160; r < ARENA_R; r += 160) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
      for (let a = 0; a < 12; a++) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((a / 12) * Math.PI * 2) * ARENA_R, Math.sin((a / 12) * Math.PI * 2) * ARENA_R);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // centre sigil
      ctx.globalAlpha = 0.16 + Math.sin(s.t / 700) * 0.05;
      ctx.font = "160px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(rd.emoji, 0, 0);
      ctx.globalAlpha = 1;

      // pillars (extruded)
      s.pillars.forEach((p) => {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, p.r * 1.05, p.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rd.floor;
        ctx.fillRect(p.x - p.r, p.y - p.r * 0.9, p.r * 2, p.r * 0.9);
        ctx.beginPath(); ctx.ellipse(p.x, p.y - p.r * 0.9, p.r, p.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = rd.glow; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = rd.glow; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
      });

      // orbs
      s.orbs.forEach((o) => {
        const bob = Math.sin(s.t / 260 + o.bob) * 6;
        const col = o.kind === "heal" ? "#34d399" : o.kind === "rune" ? "#fbbf24" : "#c084fc";
        ctx.beginPath(); ctx.arc(o.x, o.y + bob, 14, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = "16px serif"; ctx.fillStyle = "#04121a";
        ctx.fillText(o.kind === "heal" ? "❤" : o.kind === "rune" ? "⚡" : "⚔", o.x, o.y + bob + 1);
      });

      // enemies (depth sorted)
      [...s.mobs].sort((a, b) => a.y - b.y).forEach((m) => {
        const r = m.boss ? 46 : (m.def as EnemyDef).radius * (m.small ? 0.7 : 1);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.ellipse(m.x, m.y + r * 0.7, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        if (m.affix) {
          ctx.beginPath(); ctx.arc(m.x, m.y, r + 12, 0, Math.PI * 2);
          ctx.strokeStyle = m.affix.color; ctx.globalAlpha = 0.6 + Math.sin(s.t / 200) * 0.25;
          ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.fillStyle = m.hit > 0 ? "#ffffff" : m.def.color;
        ctx.shadowColor = m.def.color; ctx.shadowBlur = m.boss ? 34 : 14; ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = `${Math.round(r * 1.5)}px serif`; ctx.fillText(m.def.emoji, m.x, m.y + 2);
        // hp bar
        const bw = r * 2.4;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(m.x - bw / 2, m.y - r - 16, bw, 6);
        ctx.fillStyle = m.boss ? "#f43f5e" : "#34d399";
        ctx.fillRect(m.x - bw / 2, m.y - r - 16, bw * Math.max(0, m.hp / m.maxHp), 6);
        if (m.affix) {
          ctx.font = "bold 11px sans-serif"; ctx.fillStyle = m.affix.color;
          ctx.fillText(m.affix.label, m.x, m.y - r - 26);
        }
      });

      // shots
      s.shots.forEach((p) => {
        if (p.r === 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
      });

      // player
      const pr = 26;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath(); ctx.ellipse(s.px, s.py + 22, pr, pr * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      if (s.invul > 0) ctx.globalAlpha = 0.55 + Math.sin(s.t / 60) * 0.3;
      ctx.beginPath(); ctx.arc(s.px, s.py, pr + 4, 0, Math.PI * 2);
      ctx.strokeStyle = rd.glow; ctx.lineWidth = 3; ctx.shadowColor = rd.glow; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
      const img = bullImgRef.current;
      if (img) {
        ctx.save();
        ctx.beginPath(); ctx.arc(s.px, s.py, pr, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, s.px - pr, s.py - pr, pr * 2, pr * 2);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(s.px, s.py, pr, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a"; ctx.fill();
        ctx.font = "30px serif"; ctx.fillText("🐂", s.px, s.py + 2);
      }
      ctx.restore();
      // aim indicator
      ctx.beginPath();
      ctx.moveTo(s.px + s.aimX * 34, s.py + s.aimY * 34);
      ctx.lineTo(s.px + s.aimX * 54, s.py + s.aimY * 54);
      ctx.strokeStyle = rd.glow; ctx.lineWidth = 4; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;

      // particles
      s.parts.forEach((p) => {
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;

      // fx
      s.fx.forEach((f) => {
        const a = f.life / f.max;
        ctx.globalAlpha = a;
        if (f.r) {
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - a * 0.55), 0, Math.PI * 2);
          ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.stroke();
        }
        if (f.text) {
          ctx.font = "bold 20px sans-serif"; ctx.fillStyle = f.color;
          ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
          ctx.fillText(f.text, f.x, f.y); ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      });

      ctx.restore();

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      /* ---- HUD sync ---- */
      const boss = s.mobs.find((m) => m.boss);
      setHud({
        hp: Math.round(s.hp), maxHp: Math.round(s.maxHp), level: s.level, exp: Math.round(s.exp),
        need: expForLevel(s.level), kills: s.kills, rune: s.gainedRune + s.bankedRune, xp: s.gainedXp + s.bankedXp,
        ring: s.ring, ringName: rd.name, ringEmoji: rd.emoji, wave: Math.min(s.wave, s.waves + 1), waves: s.waves,
        left: s.mobs.length, combo: s.combo, ult: Math.round(s.ult),
        bossHp: boss ? Math.round(boss.hp) : 0, bossMax: boss ? boss.maxHp : 0, bossName: boss ? `${boss.def.emoji} ${boss.def.name}` : "",
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ================================== UI ================================== */

  if (phase === "select") {
    const sorted = [...heldBulls].sort((a, b) => (b.level || 1) - (a.level || 1));
    const max = sorted[0]?.level || 1;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Game Zone</Button>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-fuchsia-300 to-amber-300">
              🐂⚡ CsB Ascension — Sky Citadel
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              A wave-based arena roguelite. Fight through floating rings of the Citadel — 3 waves then a Ring Boss.
              Loot <span className="text-fuchsia-300">gear</span>, draft <span className="text-amber-300">boons</span> on level up,
              chain <span className="text-sky-300">combos</span> and unleash <span className="text-amber-200">Bull Nova</span>.
              Every kill grants EXP for your Bull and Rune Power ⚡ for your balance.
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-amber-400/10 border border-amber-400/40 rounded-full px-4 py-1 text-amber-200">
              <Crown className="w-3 h-3" /> MAX LEVEL {max}
            </div>
          </div>

          {sorted.length === 0 ? (
            <Card className="p-8 text-center bg-slate-900/70 border-sky-500/30">
              <p className="text-muted-foreground">No CsB Bulls detected in your wallet. Connect the wallet holding your bulls to enter the Citadel.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sorted.map((b) => (
                <Card key={b.nft_id}
                  className="p-3 bg-slate-900/70 border-2 border-sky-500/40 hover:border-amber-300 hover:scale-105 transition cursor-pointer text-center space-y-2"
                  onClick={() => startRun(b)}>
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
                    {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-4xl">🐂</span>}
                  </div>
                  <div className="font-bold text-sm">{b.nft_name}</div>
                  <div className="text-xs text-amber-300 font-bold">LVL {b.level || 1}</div>
                  <Button size="sm" className="w-full bg-sky-500 hover:bg-sky-400 text-black font-bold">ASCEND</Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "dead" || phase === "cleared") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-indigo-950 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4 bg-slate-900/80 border-2 border-sky-500/40">
          <div className="text-5xl">{phase === "dead" ? "☠️" : "👑"}</div>
          <h2 className="text-2xl font-black">{phase === "dead" ? "Fallen from the Citadel" : "Ascension Banked"}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="text-amber-300 font-black text-xl">{summary.rune}</div>Rune Power ⚡</div>
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="text-sky-300 font-black text-xl">{summary.xp}</div>Bull EXP</div>
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="font-black text-xl">{summary.kills}</div>Kills</div>
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="font-black text-xl">{summary.ring}</div>Highest Ring</div>
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="font-black text-xl">{summary.levels}</div>Levels Gained</div>
            <div className="bg-slate-800/60 rounded-lg p-3"><div className="font-black text-xl">x{summary.best}</div>Best Combo</div>
          </div>
          {phase === "dead" && <p className="text-xs text-muted-foreground">Falling costs half of your unbanked rewards — clear a Ring Boss to bank automatically.</p>}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPhase("select")}>Choose Bull</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Game Zone</Button>
          </div>
        </Card>
      </div>
    );
  }

  const rd = RINGS[(hud.ring - 1) % RINGS.length];

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* top HUD */}
      <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-2 pointer-events-none">
        <Card className="px-3 py-2 bg-slate-900/80 border-sky-500/40 backdrop-blur pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-lg">{bull?.image ? "🐂" : "🐂"}</span>
            <span>{bull?.nft_name}</span>
            <span className="text-amber-300">LVL {hud.level}</span>
          </div>
          <div className="mt-1 w-56 space-y-1">
            <div className="flex items-center gap-1 text-[10px]"><Heart className="w-3 h-3 text-rose-400" />
              <Progress value={(hud.hp / hud.maxHp) * 100} className="h-2 flex-1" />
              <span>{hud.hp}/{hud.maxHp}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]"><Sparkles className="w-3 h-3 text-sky-400" />
              <Progress value={(hud.exp / hud.need) * 100} className="h-2 flex-1" />
              <span>{hud.exp}/{hud.need}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]"><Flame className="w-3 h-3 text-amber-400" />
              <Progress value={hud.ult} className="h-2 flex-1" />
              <span>{hud.ult >= 100 ? "NOVA READY" : `${hud.ult}%`}</span>
            </div>
          </div>
        </Card>

        <Card className="px-3 py-2 bg-slate-900/80 border-fuchsia-500/40 backdrop-blur text-xs font-bold space-y-1">
          <div>{rd.emoji} Ring {hud.ring} · {rd.name}</div>
          <div className="text-muted-foreground">{hud.wave > hud.waves ? "BOSS WAVE" : `Wave ${hud.wave}/${hud.waves}`} · {hud.left} left</div>
          <div className="flex items-center gap-2">
            <span className="text-amber-300 flex items-center gap-1"><Coins className="w-3 h-3" />{hud.rune}</span>
            <span className="text-sky-300 flex items-center gap-1"><Swords className="w-3 h-3" />{hud.kills}</span>
            {hud.combo > 1 && <span className="text-rose-300">COMBO x{hud.combo}</span>}
          </div>
        </Card>

        <Card className="px-3 py-2 bg-slate-900/80 border-amber-400/40 backdrop-blur text-[10px] space-y-0.5">
          {(["horn", "hide", "relic"] as Slot[]).map((sl) => {
            const gr = gear[sl];
            return (
              <div key={sl} className="flex items-center gap-1">
                <span className="opacity-60 w-10 uppercase">{sl}</span>
                {gr
                  ? <span style={{ color: RARITY_COLOR[gr.rarity] }} className="font-bold">{gr.name} · +{gr.atk}⚔ +{gr.hp}❤ +{gr.crit}%🎯</span>
                  : <span className="opacity-40">empty</span>}
              </div>
            );
          })}
          {ownedBoons.length > 0 && (
            <div className="pt-1 border-t border-white/10">{ownedBoons.map((b, i) => <span key={i} title={b.name} className="mr-1">{b.emoji}</span>)}</div>
          )}
        </Card>
      </div>

      {/* boss bar */}
      {hud.bossMax > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[min(560px,80vw)] pointer-events-none">
          <Card className="px-3 py-2 bg-slate-900/85 border-rose-500/60">
            <div className="text-xs font-black text-rose-300 text-center mb-1">{hud.bossName}</div>
            <Progress value={(hud.bossHp / hud.bossMax) * 100} className="h-3" />
          </Card>
        </div>
      )}

      {/* boon draft */}
      {boonPick && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-30">
          <div className="max-w-3xl w-full space-y-4 text-center">
            <h3 className="text-2xl font-black text-amber-300">CHOOSE A BOON</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {boonPick.map((b) => (
                <Card key={b.id} onClick={() => applyBoon(b)}
                  className="p-5 bg-slate-900/90 border-2 border-amber-400/40 hover:border-amber-300 hover:scale-105 transition cursor-pointer space-y-2">
                  <div className="text-4xl">{b.emoji}</div>
                  <div className="font-black">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-4 left-4">
        <div ref={joyRef}
          className="w-32 h-32 rounded-full bg-slate-900/50 border-2 border-sky-400/40 relative touch-none"
          onTouchStart={joyMove} onTouchMove={joyMove} onTouchEnd={joyEnd}
          onMouseDown={joyMove} onMouseMove={(e) => g.current.joy.active && joyMove(e)} onMouseUp={joyEnd} onMouseLeave={joyEnd}>
          <div className="absolute w-14 h-14 rounded-full bg-sky-400/40 border border-sky-200/60 top-1/2 left-1/2"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-sky-400/60 text-sky-300"
            onTouchStart={(e) => { e.preventDefault(); g.current.dashReq = true; }}
            onClick={() => { g.current.dashReq = true; }}><Zap className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline"
            className={`border-amber-400/60 text-amber-300 ${hud.ult >= 100 ? "animate-pulse bg-amber-400/20" : "opacity-60"}`}
            onTouchStart={(e) => { e.preventDefault(); g.current.ultReq = true; }}
            onClick={() => { g.current.ultReq = true; }}><Shield className="w-4 h-4" /></Button>
        </div>
        <Button className="w-20 h-20 rounded-full bg-sky-500 hover:bg-sky-400 text-black text-2xl shadow-[0_0_25px_rgba(56,189,248,0.6)]"
          onTouchStart={(e) => { e.preventDefault(); g.current.attackReq = true; }}
          onClick={() => { g.current.attackReq = true; }}>⚔️</Button>
        <div className="text-[10px] text-sky-200/80 text-right max-w-[190px] pointer-events-none">
          WASD move · SPACE/J attack (3-hit combo) · SHIFT/K dodge · Q/L Bull Nova
        </div>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => endRun(false)}>Leave &amp; Bank</Button>
      </div>
    </div>
  );
}
