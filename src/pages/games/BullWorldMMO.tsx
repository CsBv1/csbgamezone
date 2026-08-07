import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Map as MapIcon, Sparkles, Swords, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorldChat } from "@/components/WorldChat";
import { audioManager } from "@/hooks/useAudioManager";
import { useBullWorldCharacter, StatKey, BwCharacter } from "@/hooks/useBullWorldCharacter";
import { useWorldBoss } from "@/hooks/useWorldBoss";
import {
  REGIONS, REGION_BY_ID, REGION_SIZE, WORLD_WIDTH, WORLD_HEIGHT,
  regionAt, regionBounds, SPAWN, Region,
} from "@/game/bullworld/regions";
import {
  WEAPONS, WEAPON_BY_ID, SKILLS, unlockedSkills, ENEMY_BY_ID, EnemyTemplate,
  AIState, rollDamage, enemyDamage, hash2, expForLevel, BOSS_BY_KEY,
} from "@/game/bullworld/combat";

/* ------------------------------- types ---------------------------------- */

interface LiveEnemy {
  uid: string;
  tpl: EnemyTemplate;
  x: number; y: number;
  hx: number; hy: number;        // home / patrol anchor
  hp: number; maxHp: number;
  state: AIState;
  nextAttack: number;
  wanderUntil: number;
  vx: number; vy: number;
  hitFlash: number;
}

interface Floater { x: number; y: number; text: string; color: string; life: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface OtherPlayer { user_id: string; x: number; y: number; username: string | null; color: string; }

const DAY_MS = 10 * 60 * 1000;   // full day/night cycle
const ENEMIES_PER_REGION = 26;
const VIEW_PAD = 200;

/* ============================ CHARACTER SELECT =========================== */

function CharacterSelect({
  bulls, onPick, onBack, loading,
}: {
  bulls: Array<{ nft_id: string; nft_name: string; level: number; image?: string | null }>;
  onPick: (b: { nft_id: string | null; name: string; image?: string | null; level?: number }) => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
            ENTER THE BULL WORLD
          </h1>
          <p className="text-muted-foreground">Select the Bull that becomes your character. Your NFT is your hero.</p>
        </div>

        {loading ? (
          <div className="text-center py-16"><Sparkles className="w-10 h-10 mx-auto animate-spin text-cyan-400" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bulls.map((b) => (
              <Card key={b.nft_id} onClick={() => onPick({ nft_id: b.nft_id, name: b.nft_name, image: b.image, level: b.level })}
                className="cursor-pointer p-3 bg-slate-900/80 border-2 border-cyan-500/40 hover:border-cyan-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center mb-2">
                  {b.image ? <img src={b.image} alt={`${b.nft_name} Cardano Stake Bull NFT character`} loading="lazy" className="w-full h-full object-cover" />
                    : <span className="text-5xl">🐂</span>}
                </div>
                <div className="font-bold text-sm text-cyan-300">{b.nft_name}</div>
                <div className="text-xs text-amber-300">Lv {b.level} · Legendary</div>
              </Card>
            ))}
            <Card onClick={() => onPick({ nft_id: null, name: "Guest Bull", level: 1 })}
              className="cursor-pointer p-3 bg-slate-900/80 border-2 border-slate-600 hover:border-slate-300 hover:scale-105 transition-all">
              <div className="aspect-square rounded-lg bg-slate-800 flex items-center justify-center mb-2 text-5xl grayscale">🐂</div>
              <div className="font-bold text-sm text-slate-300">Guest Bull</div>
              <div className="text-xs text-slate-500">Lv 1 · No NFT needed</div>
            </Card>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">
          No key required. Holders play their own Bull with its levelled stats — guests start at level 1.
        </p>
      </div>
    </div>
  );
}

/* ================================= WORLD ================================= */

export default function BullWorldMMO() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [bulls, setBulls] = useState<any[]>([]);
  const [bullsLoading, setBullsLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [panel, setPanel] = useState<null | "stats" | "map" | "skills">(null);
  const [others, setOthers] = useState<OtherPlayer[]>([]);
  const [hudTick, setHudTick] = useState(0);
  const [nearPortal, setNearPortal] = useState<Region["portal"] | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(REGION_BY_ID["bull-city"]);

  const { character, loading, chooseBull, patch, gainExp, spendSkillPoint, discoverRegion, STAT_STEP } =
    useBullWorldCharacter(userId);
  const { boss, myDamage, damageBoss } = useWorldBoss(userId, username);

  /* ------------------------------ mutable refs --------------------------- */
  const p = useRef({
    x: SPAWN.x, y: SPAWN.y, dir: "down", hp: 100, maxHp: 100,
    energy: 100, maxEnergy: 100, shield: 0, shieldUntil: 0,
    buffUntil: 0, buffMul: 1, attackReady: 0, invulnUntil: 0, dead: false,
  });
  const charRef = useRef<BwCharacter | null>(null);
  const bossRef = useRef(boss);
  const enemies = useRef<LiveEnemy[]>([]);
  const spawnedRegion = useRef<string>("");
  const floaters = useRef<Floater[]>([]);
  const particles = useRef<Particle[]>([]);
  const cooldowns = useRef<Record<string, number>>({});
  const keysDown = useRef<Set<string>>(new Set());
  const joystick = useRef({ active: false, dx: 0, dy: 0 });
  const lastDbSync = useRef(0);
  const lastBossHit = useRef(0);

  charRef.current = character;
  bossRef.current = boss;

  /* -------------------------------- init --------------------------------- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Please login", description: "Sign in to enter Bull World", variant: "destructive" }); navigate("/"); return; }
      setUserId(user.id);
      const [{ data: prof }, { data: nft }] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
        supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", user.id).order("level", { ascending: false }),
      ]);
      setUsername(prof?.username || "Bull");
      const rows = ((nft || []) as any[]).map((r, i) => ({
        nft_id: r.nft_id,
        nft_name: `Bull #${(r.nft_name || "").match(/(\d+)\s*$/)?.[1] || i + 1}`,
        level: r.level || 1,
        image: r.image_url || null,
      }));
      setBulls(rows);
      setBullsLoading(false);
    })();
  }, [navigate, toast]);

  /* sync player runtime state from the stored character once loaded */
  useEffect(() => {
    if (!character) return;
    p.current.x = character.pos_x; p.current.y = character.pos_y;
    p.current.hp = character.hp; p.current.maxHp = character.max_hp;
    p.current.energy = character.energy; p.current.maxEnergy = character.max_energy;
    setCurrentRegion(regionAt(character.pos_x, character.pos_y));
  }, [character?.id]);

  /* --------------------------- multiplayer sync --------------------------- */
  useEffect(() => {
    if (!userId || !character) return;
    const push = async () => {
      await supabase.from("world_players").upsert({
        user_id: userId, x: p.current.x, y: p.current.y, direction: p.current.dir,
        color: "#00d4ff", username, is_online: true, last_seen: new Date().toISOString(),
      } as any, { onConflict: "user_id" });
    };
    const pull = async () => {
      const { data } = await supabase.from("world_players").select("user_id,x,y,username,color")
        .eq("is_online", true).gt("last_seen", new Date(Date.now() - 60000).toISOString()).limit(200);
      setOthers(((data || []) as any[]).filter((o) => o.user_id !== userId));
    };
    push(); pull();
    const t1 = window.setInterval(push, 900);
    const t2 = window.setInterval(pull, 2500);
    return () => {
      window.clearInterval(t1); window.clearInterval(t2);
      supabase.from("world_players").update({ is_online: false }).eq("user_id", userId).then(() => {});
    };
  }, [userId, character?.id, username]);

  /* ------------------------------ enemy spawn ----------------------------- */
  const spawnRegionEnemies = useCallback((region: Region) => {
    if (spawnedRegion.current === region.id) return;
    spawnedRegion.current = region.id;
    if (region.safe || region.enemies.length === 0) { enemies.current = []; return; }
    const b = regionBounds(region);
    const list: LiveEnemy[] = [];
    for (let i = 0; i < ENEMIES_PER_REGION; i++) {
      const tplId = region.enemies[i % region.enemies.length];
      const tpl = ENEMY_BY_ID[tplId];
      if (!tpl) continue;
      const x = b.x + 200 + hash2(region.col * 97 + i, region.row * 31 + i, 7) * (REGION_SIZE - 400);
      const y = b.y + 200 + hash2(region.col * 53 + i, region.row * 89 + i, 13) * (REGION_SIZE - 400);
      list.push({
        uid: `${region.id}-${i}`, tpl, x, y, hx: x, hy: y,
        hp: tpl.hp, maxHp: tpl.hp, state: "patrol", nextAttack: 0,
        wanderUntil: 0, vx: 0, vy: 0, hitFlash: 0,
      });
    }
    enemies.current = list;
  }, []);

  /* -------------------------------- helpers -------------------------------- */
  const addFloat = (x: number, y: number, text: string, color: string) =>
    floaters.current.push({ x, y, text, color, life: 1 });

  const burst = (x: number, y: number, color: string, n = 12) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      particles.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color, size: 2 + Math.random() * 3 });
    }
  };

  const killReward = useCallback((e: LiveEnemy) => {
    const c = charRef.current; if (!c) return;
    gainExp(e.tpl.exp);
    patch({ gold: c.gold + e.tpl.gold });
    addFloat(e.x, e.y - 40, `+${e.tpl.exp} XP`, "#facc15");
    burst(e.x, e.y, e.tpl.color, 22);
    audioManager.playSFX("win");
  }, [gainExp, patch]);

  const damageEnemy = useCallback((e: LiveEnemy, amount: number, crit: boolean) => {
    e.hp -= amount; e.hitFlash = 1;
    if (e.state === "patrol") e.state = "chase";
    addFloat(e.x, e.y - 20, `${crit ? "CRIT " : ""}${amount}`, crit ? "#ff4d6d" : "#ffffff");
    if (e.hp <= 0) { killReward(e); enemies.current = enemies.current.filter((x) => x.uid !== e.uid); }
  }, [killReward]);

  /* --------------------------------- attack -------------------------------- */
  const doAttack = useCallback(() => {
    const c = charRef.current; if (!c || p.current.dead) return;
    const now = performance.now();
    const w = WEAPON_BY_ID[c.weapon] || WEAPONS[0];
    if (now < p.current.attackReady) return;
    p.current.attackReady = now + w.cooldown;
    audioManager.playSFX("click");
    burst(p.current.x, p.current.y, "#00d4ff", 6);

    const atk = c.attack * (now < p.current.buffUntil ? p.current.buffMul : 1);
    let hit = false;
    for (const e of [...enemies.current]) {
      if (Math.hypot(e.x - p.current.x, e.y - p.current.y) <= w.range + 30) {
        const { damage, crit } = rollDamage(atk, w, e.tpl.defense, c.crit_chance, 1, c.magic);
        damageEnemy(e, damage, crit); hit = true;
      }
    }
    const b = bossRef.current;
    if (b && Math.hypot(b.pos_x - p.current.x, b.pos_y - p.current.y) <= w.range + 120) {
      const { damage, crit } = rollDamage(atk, w, 40, c.crit_chance, 1, c.magic);
      addFloat(b.pos_x, b.pos_y - 60, `${crit ? "CRIT " : ""}${damage}`, "#ffd700");
      if (now - lastBossHit.current > 250) { lastBossHit.current = now; damageBoss(damage); }
      hit = true;
    }
    if (!hit) addFloat(p.current.x, p.current.y - 50, "miss", "#94a3b8");
  }, [damageEnemy, damageBoss]);

  /* --------------------------------- skills -------------------------------- */
  const useSkill = useCallback((skillId: string) => {
    const c = charRef.current; if (!c || p.current.dead) return;
    const s = SKILLS.find((x) => x.id === skillId); if (!s) return;
    if (c.level < s.unlockLevel) { toast({ title: `🔒 ${s.name}`, description: `Unlocks at level ${s.unlockLevel}` }); return; }
    const now = performance.now();
    if ((cooldowns.current[s.id] || 0) > now) return;
    if (p.current.energy < s.energy) { addFloat(p.current.x, p.current.y - 60, "No energy", "#f87171"); return; }
    cooldowns.current[s.id] = now + s.cooldown;
    p.current.energy -= s.energy;
    const w = WEAPON_BY_ID[c.weapon] || WEAPONS[0];
    const dirVec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.current.dir] || [0, 1];

    switch (s.effect.kind) {
      case "damage": {
        burst(p.current.x, p.current.y, "#c084fc", 30);
        for (const e of [...enemies.current]) {
          if (Math.hypot(e.x - p.current.x, e.y - p.current.y) <= s.effect.radius) {
            const { damage, crit } = rollDamage(c.attack, w, e.tpl.defense, c.crit_chance, s.effect.power, c.magic);
            damageEnemy(e, damage, crit);
          }
        }
        const b = bossRef.current;
        if (b && Math.hypot(b.pos_x - p.current.x, b.pos_y - p.current.y) <= s.effect.radius + 120) {
          const { damage } = rollDamage(c.attack, w, 40, c.crit_chance, s.effect.power, c.magic);
          addFloat(b.pos_x, b.pos_y - 60, `${damage}`, "#ffd700"); damageBoss(damage);
        }
        break;
      }
      case "dash": {
        p.current.x = Math.max(40, Math.min(WORLD_WIDTH - 40, p.current.x + dirVec[0] * s.effect.distance));
        p.current.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, p.current.y + dirVec[1] * s.effect.distance));
        burst(p.current.x, p.current.y, "#22d3ee", 24);
        for (const e of [...enemies.current]) {
          if (Math.hypot(e.x - p.current.x, e.y - p.current.y) <= 140) {
            const { damage, crit } = rollDamage(c.attack, w, e.tpl.defense, c.crit_chance, s.effect.power, c.magic);
            damageEnemy(e, damage, crit);
          }
        }
        break;
      }
      case "heal":
        p.current.hp = Math.min(p.current.maxHp, p.current.hp + s.effect.amount + c.level * 2);
        addFloat(p.current.x, p.current.y - 60, `+${s.effect.amount + c.level * 2} HP`, "#4ade80");
        burst(p.current.x, p.current.y, "#4ade80", 20);
        break;
      case "shield":
        p.current.shield = s.effect.amount + c.defense * 2;
        p.current.shieldUntil = now + s.effect.duration;
        addFloat(p.current.x, p.current.y - 60, "Shield up!", "#60a5fa");
        break;
      case "buff":
        p.current.buffMul = s.effect.attack; p.current.buffUntil = now + s.effect.duration;
        addFloat(p.current.x, p.current.y - 60, "BERSERK!", "#ef4444");
        break;
      case "teleport": {
        p.current.x = Math.max(40, Math.min(WORLD_WIDTH - 40, p.current.x + dirVec[0] * s.effect.distance));
        p.current.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, p.current.y + dirVec[1] * s.effect.distance));
        burst(p.current.x, p.current.y, "#a855f7", 30);
        break;
      }
      case "summon":
        p.current.buffMul = Math.max(p.current.buffMul, s.effect.power);
        p.current.buffUntil = now + s.effect.duration;
        addFloat(p.current.x, p.current.y - 60, "Companion joins!", "#f472b6");
        break;
    }
    setHudTick((t) => t + 1);
  }, [damageEnemy, damageBoss, toast]);

  /* --------------------------------- input --------------------------------- */
  useEffect(() => {
    if (!character) return;
    const down = (e: KeyboardEvent) => {
      keysDown.current.add(e.key.toLowerCase());
      if (e.key === " ") { e.preventDefault(); doAttack(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) {
        const list = unlockedSkills(charRef.current?.level || 1);
        if (list[n - 1]) useSkill(list[n - 1].id);
      }
      if (e.key.toLowerCase() === "e" && nearPortal) {
        navigate(nearPortal.route);
      }
      if (e.key.toLowerCase() === "m") setPanel((v) => (v === "map" ? null : "map"));
    };
    const up = (e: KeyboardEvent) => keysDown.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [character, doAttack, useSkill, nearPortal, navigate]);

  /* ------------------------------- game loop -------------------------------- */
  useEffect(() => {
    if (!character) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      const c = charRef.current;
      if (!c) { rafRef.current = requestAnimationFrame(loop); return; }

      /* ---- movement ---- */
      const speed = (c.move_speed * 1.1) * (dt / 16);
      let dx = 0, dy = 0;
      const k = keysDown.current;
      if (k.has("w") || k.has("arrowup")) dy -= 1;
      if (k.has("s") || k.has("arrowdown")) dy += 1;
      if (k.has("a") || k.has("arrowleft")) dx -= 1;
      if (k.has("d") || k.has("arrowright")) dx += 1;
      if (joystick.current.active) { dx += joystick.current.dx; dy += joystick.current.dy; }
      const mag = Math.hypot(dx, dy);
      if (mag > 0 && !p.current.dead) {
        dx /= mag; dy /= mag;
        p.current.x = Math.max(30, Math.min(WORLD_WIDTH - 30, p.current.x + dx * speed));
        p.current.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, p.current.y + dy * speed));
        p.current.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      }

      /* ---- energy regen ---- */
      p.current.energy = Math.min(p.current.maxEnergy, p.current.energy + dt * 0.004 * (1 + c.level * 0.02));
      if (p.current.dead && now > p.current.invulnUntil) {
        p.current.dead = false; p.current.hp = p.current.maxHp * 0.5;
        p.current.x = SPAWN.x; p.current.y = SPAWN.y;
      }

      /* ---- region ---- */
      const region = regionAt(p.current.x, p.current.y);
      if (region.id !== spawnedRegion.current) {
        spawnRegionEnemies(region);
        setCurrentRegion(region);
        discoverRegion(region.id);
      }

      /* ---- portal proximity ---- */
      let portal: Region["portal"] | null = null;
      if (region.portal) {
        const b = regionBounds(region);
        if (Math.hypot(p.current.x - b.cx, p.current.y - b.cy) < 220) portal = region.portal;
      }
      setNearPortal((prev) => (prev?.route === portal?.route ? prev : portal));

      /* ---- enemy AI ---- */
      for (const e of enemies.current) {
        const dist = Math.hypot(p.current.x - e.x, p.current.y - e.y);
        const lowHp = e.hp < e.maxHp * 0.22;
        if (p.current.dead) e.state = "patrol";
        else if (lowHp && dist < e.tpl.aggroRange) e.state = "retreat";
        else if (dist <= e.tpl.attackRange) e.state = "attack";
        else if (dist < e.tpl.aggroRange) e.state = "chase";
        else if (e.state !== "patrol" && dist > e.tpl.aggroRange * 1.6) e.state = "patrol";

        const sp = e.tpl.speed * (dt / 16);
        if (e.state === "chase") {
          e.x += ((p.current.x - e.x) / dist) * sp; e.y += ((p.current.y - e.y) / dist) * sp;
        } else if (e.state === "retreat") {
          e.x -= ((p.current.x - e.x) / dist) * sp * 1.1; e.y -= ((p.current.y - e.y) / dist) * sp * 1.1;
          e.hp = Math.min(e.maxHp, e.hp + dt * 0.004 * e.maxHp * 0.01);
          if (e.hp > e.maxHp * 0.5) e.state = "defend";
        } else if (e.state === "attack") {
          if (now > e.nextAttack) {
            e.nextAttack = now + e.tpl.attackCooldown;
            let dmg = enemyDamage(e.tpl.attack, c.defense);
            if (now < p.current.shieldUntil && p.current.shield > 0) {
              const absorbed = Math.min(p.current.shield, dmg);
              p.current.shield -= absorbed; dmg -= absorbed;
            }
            if (dmg > 0) {
              p.current.hp -= dmg;
              addFloat(p.current.x, p.current.y - 40, `-${dmg}`, "#f87171");
              audioManager.playSFX("lose");
            }
            if (p.current.hp <= 0 && !p.current.dead) {
              p.current.dead = true; p.current.hp = 0; p.current.invulnUntil = now + 3500;
              addFloat(p.current.x, p.current.y - 60, "Defeated! Respawning…", "#ef4444");
            }
          }
        } else if (e.state === "patrol") {
          if (now > e.wanderUntil) {
            e.wanderUntil = now + 1200 + Math.random() * 2200;
            const a = Math.random() * Math.PI * 2;
            e.vx = Math.cos(a) * e.tpl.speed * 0.4; e.vy = Math.sin(a) * e.tpl.speed * 0.4;
          }
          e.x += e.vx * (dt / 16); e.y += e.vy * (dt / 16);
          if (Math.hypot(e.x - e.hx, e.y - e.hy) > 340) { e.vx *= -1; e.vy *= -1; }
        } else if (e.state === "defend") {
          e.hp = Math.min(e.maxHp, e.hp + dt * 0.02);
          if (e.hp >= e.maxHp * 0.75) e.state = "patrol";
        }
        e.hitFlash = Math.max(0, e.hitFlash - dt / 250);
      }

      /* ---- boss contact damage ---- */
      const bs = bossRef.current;
      if (bs && !p.current.dead) {
        const tpl = BOSS_BY_KEY[bs.boss_key];
        const d = Math.hypot(bs.pos_x - p.current.x, bs.pos_y - p.current.y);
        if (tpl && d < 160 && now > (cooldowns.current.__boss || 0)) {
          cooldowns.current.__boss = now + 1600;
          const dmg = enemyDamage(tpl.attack, c.defense);
          p.current.hp -= dmg;
          addFloat(p.current.x, p.current.y - 40, `-${dmg}`, "#fb7185");
          if (p.current.hp <= 0) { p.current.dead = true; p.current.hp = 0; p.current.invulnUntil = now + 4000; }
        }
      }

      /* ---- persist ---- */
      if (now - lastDbSync.current > 4000) {
        lastDbSync.current = now;
        patch({
          pos_x: Math.round(p.current.x), pos_y: Math.round(p.current.y),
          hp: Math.round(p.current.hp), energy: Math.round(p.current.energy), region: region.id,
        });
      }

      /* ---- particles / floaters ---- */
      particles.current = particles.current.filter((q) => {
        q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.94; q.life -= dt / 700; return q.life > 0;
      });
      floaters.current = floaters.current.filter((f) => { f.y -= dt * 0.03; f.life -= dt / 1100; return f.life > 0; });

      draw(ctx, canvas, region, now, c);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, others, spawnRegionEnemies, patch, discoverRegion]);

  /* -------------------------------- renderer -------------------------------- */
  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, region: Region, now: number, c: BwCharacter) => {
    const W = canvas.width, H = canvas.height;
    const camX = p.current.x - W / 2, camY = p.current.y - H / 2;
    ctx.clearRect(0, 0, W, H);

    /* --- ground per visible region --- */
    const c0 = Math.max(0, Math.floor(camX / REGION_SIZE)), c1 = Math.min(4, Math.floor((camX + W) / REGION_SIZE));
    const r0 = Math.max(0, Math.floor(camY / REGION_SIZE)), r1 = Math.min(2, Math.floor((camY + H) / REGION_SIZE));
    for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) {
      const reg = REGIONS.find((r) => r.col === col && r.row === row); if (!reg) continue;
      const b = regionBounds(reg);
      const g = ctx.createLinearGradient(b.x - camX, b.y - camY, b.x - camX, b.y + b.h - camY);
      g.addColorStop(0, reg.ground); g.addColorStop(1, "#0b1020");
      ctx.fillStyle = g;
      ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
      ctx.fillStyle = reg.tint;
      ctx.fillRect(b.x - camX, b.y - camY, b.w, b.h);
      /* region border glow */
      ctx.strokeStyle = reg.accent + "55"; ctx.lineWidth = 4;
      ctx.strokeRect(b.x - camX, b.y - camY, b.w, b.h);
      /* label */
      ctx.font = "bold 34px sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = reg.accent + "33";
      ctx.fillText(`${reg.emoji} ${reg.name.toUpperCase()}`, b.cx - camX, b.y - camY + 70);
    }

    /* --- animated props (trees / rocks / crystals) --- */
    const cell = 260;
    const sx = Math.floor(camX / cell), ex = Math.floor((camX + W) / cell);
    const sy = Math.floor(camY / cell), ey = Math.floor((camY + H) / cell);
    for (let gx = sx; gx <= ex; gx++) for (let gy = sy; gy <= ey; gy++) {
      const r = hash2(gx, gy, 3); if (r > 0.42) continue;
      const reg = regionAt(gx * cell, gy * cell);
      const px = gx * cell + hash2(gx, gy, 5) * cell - camX;
      const py = gy * cell + hash2(gx, gy, 9) * cell - camY;
      const sway = Math.sin(now / 700 + gx + gy) * 4;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = reg.accent + "40";
      ctx.beginPath(); ctx.ellipse(px, py + 16, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = reg.accent;
      ctx.beginPath();
      ctx.moveTo(px - 14, py + 14); ctx.lineTo(px + sway, py - 34); ctx.lineTo(px + 14, py + 14);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* --- portal --- */
    if (region.portal) {
      const b = regionBounds(region);
      const pulse = 1 + Math.sin(now / 320) * 0.08;
      const px = b.cx - camX, py = b.cy - camY;
      const gg = ctx.createRadialGradient(px, py, 0, px, py, 120 * pulse);
      gg.addColorStop(0, region.accent + "aa"); gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg; ctx.fillRect(px - 140, py - 140, 280, 280);
      ctx.font = "56px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(region.portal.emoji, px, py + 16);
      ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(region.portal.name, px, py + 70);
      ctx.font = "12px sans-serif"; ctx.fillStyle = region.accent;
      ctx.fillText("PRESS E TO ENTER", px, py + 92);
    }

    /* --- world boss --- */
    const bs = bossRef.current;
    if (bs) {
      const tpl = BOSS_BY_KEY[bs.boss_key];
      const bx = bs.pos_x - camX, by = bs.pos_y - camY;
      if (bx > -300 && bx < W + 300 && by > -300 && by < H + 300 && tpl) {
        const pulse = 1 + Math.sin(now / 260) * 0.06;
        const gg = ctx.createRadialGradient(bx, by, 0, bx, by, 200 * pulse);
        gg.addColorStop(0, tpl.color + "88"); gg.addColorStop(1, "transparent");
        ctx.fillStyle = gg; ctx.fillRect(bx - 220, by - 220, 440, 440);
        ctx.font = `${110 * pulse}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(tpl.emoji, bx, by + 40);
        ctx.fillStyle = "#000a"; ctx.fillRect(bx - 130, by - 120, 260, 16);
        ctx.fillStyle = tpl.color; ctx.fillRect(bx - 130, by - 120, 260 * (bs.hp / bs.max_hp), 16);
        ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "#fff";
        ctx.fillText(`${bs.name} · Lv${bs.level}`, bx, by - 130);
      }
    }

    /* --- enemies --- */
    for (const e of enemies.current) {
      const ex2 = e.x - camX, ey2 = e.y - camY;
      if (ex2 < -VIEW_PAD || ex2 > W + VIEW_PAD || ey2 < -VIEW_PAD || ey2 > H + VIEW_PAD) continue;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(ex2, ey2 + 22, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
      if (e.hitFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${e.hitFlash * 0.6})`;
        ctx.beginPath(); ctx.arc(ex2, ey2, 30, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = "34px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(e.tpl.emoji, ex2, ey2 + 12);
      ctx.fillStyle = "#000a"; ctx.fillRect(ex2 - 22, ey2 - 32, 44, 5);
      ctx.fillStyle = e.tpl.color; ctx.fillRect(ex2 - 22, ey2 - 32, 44 * Math.max(0, e.hp / e.maxHp), 5);
      ctx.font = "9px sans-serif"; ctx.fillStyle = "#cbd5e1";
      ctx.fillText(e.state.toUpperCase(), ex2, ey2 - 36);
    }

    /* --- other players --- */
    for (const o of others) {
      const ox = o.x - camX, oy = o.y - camY;
      if (ox < -VIEW_PAD || ox > W + VIEW_PAD || oy < -VIEW_PAD || oy > H + VIEW_PAD) continue;
      ctx.font = "30px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🐂", ox, oy + 10);
      ctx.font = "bold 11px sans-serif"; ctx.fillStyle = o.color || "#00d4ff";
      ctx.fillText(o.username || "Bull", ox, oy - 24);
    }

    /* --- player --- */
    const px = W / 2, py = H / 2;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(px, py + 26, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (now < p.current.shieldUntil) {
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 40, 0, Math.PI * 2); ctx.stroke();
    }
    if (now < p.current.buffUntil) {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 46, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = p.current.dead ? 0.35 : 1;
    ctx.font = "44px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🐂", px, py + 16);
    ctx.globalAlpha = 1;
    ctx.font = "bold 13px sans-serif"; ctx.fillStyle = "#facc15";
    ctx.fillText(`${c.bull_name} · Lv${c.level}`, px, py - 34);
    const w = WEAPON_BY_ID[c.weapon] || WEAPONS[0];
    ctx.font = "22px sans-serif";
    ctx.fillText(w.emoji, px + (p.current.dir === "left" ? -32 : 32), py + 12);

    /* --- particles & floaters --- */
    for (const q of particles.current) {
      ctx.globalAlpha = Math.max(0, q.life); ctx.fillStyle = q.color;
      ctx.fillRect(q.x - camX, q.y - camY, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.font = "bold 16px sans-serif";
    for (const f of floaters.current) {
      ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - camX, f.y - camY);
    }
    ctx.globalAlpha = 1;

    /* --- weather --- */
    if (region.weather !== "clear") {
      const cnt = region.weather === "fog" ? 0 : 90;
      ctx.strokeStyle = region.weather === "snow" ? "#ffffffaa"
        : region.weather === "ash" ? "#ff8a5088"
        : region.weather === "sand" ? "#e8c96a66" : "#9ecbff88";
      ctx.lineWidth = region.weather === "snow" ? 3 : 1.5;
      for (let i = 0; i < cnt; i++) {
        const t = (now / (region.weather === "snow" ? 6 : 2) + i * 137) % (H + 200);
        const x = (i * 173 + Math.sin(now / 900 + i) * 40) % W;
        ctx.beginPath(); ctx.moveTo(x, t - 200); ctx.lineTo(x + (region.weather === "sand" ? 12 : 3), t - 190); ctx.stroke();
      }
      if (region.weather === "fog") {
        ctx.fillStyle = "rgba(160,180,200,0.14)"; ctx.fillRect(0, 0, W, H);
      }
    }

    /* --- day / night --- */
    const phase = ((now % DAY_MS) / DAY_MS);
    const night = Math.max(0, Math.cos(phase * Math.PI * 2)) * 0.55;
    if (night > 0.02) { ctx.fillStyle = `rgba(6,10,35,${night})`; ctx.fillRect(0, 0, W, H); }
  };

  /* -------------------------------- HUD tick -------------------------------- */
  useEffect(() => {
    const t = window.setInterval(() => setHudTick((v) => v + 1), 200);
    return () => window.clearInterval(t);
  }, []);

  /* ------------------------------ fast travel ------------------------------- */
  const fastTravel = (regionId: string) => {
    const b = regionBounds(REGION_BY_ID[regionId]);
    p.current.x = b.cx; p.current.y = b.cy;
    setPanel(null);
    toast({ title: `🌀 Travelled to ${REGION_BY_ID[regionId].name}` });
  };

  /* --------------------------------- render --------------------------------- */
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Sparkles className="w-12 h-12 animate-spin text-cyan-400" /></div>;
  }

  if (!character || selecting) {
    return (
      <CharacterSelect
        bulls={bulls}
        loading={bullsLoading}
        onBack={() => (selecting ? setSelecting(false) : navigate("/dashboard"))}
        onPick={async (b) => { await chooseBull(b); setSelecting(false); }}
      />
    );
  }

  const skills = unlockedSkills(character.level);
  const now = performance.now();
  const hpPct = Math.max(0, (p.current.hp / p.current.maxHp) * 100);
  const enPct = Math.max(0, (p.current.energy / p.current.maxEnergy) * 100);
  const xpPct = (character.experience / expForLevel(character.level)) * 100;

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* top HUD */}
      <div className="absolute top-0 left-0 right-0 p-2 md:p-3 flex items-start gap-2 pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate("/dashboard")} className="gap-1"><ArrowLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setPanel(panel === "map" ? null : "map")}><MapIcon className="w-4 h-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setPanel(panel === "stats" ? null : "stats")}>
            <Swords className="w-4 h-4" />{character.skill_points > 0 && <span className="ml-1 text-amber-400 font-bold">{character.skill_points}</span>}
          </Button>
        </div>
        <Card className="pointer-events-none flex-1 max-w-md p-2 bg-slate-900/85 border-cyan-500/40 backdrop-blur">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-cyan-300 truncate">{character.bull_name} · Lv {character.level}</span>
            <span className="text-amber-300">🪙 {character.gold}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded overflow-hidden mb-1"><div className="h-full bg-gradient-to-r from-rose-600 to-red-400 transition-all" style={{ width: `${hpPct}%` }} /></div>
          <div className="h-1.5 bg-slate-800 rounded overflow-hidden mb-1"><div className="h-full bg-gradient-to-r from-cyan-600 to-sky-400 transition-all" style={{ width: `${enPct}%` }} /></div>
          <div className="h-1 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${Math.min(100, xpPct)}%` }} /></div>
        </Card>
        <Card className="pointer-events-none hidden sm:block p-2 bg-slate-900/85 border-fuchsia-500/40 backdrop-blur text-xs">
          <div className="font-bold text-fuchsia-300">{currentRegion.emoji} {currentRegion.name}</div>
          <div className="text-muted-foreground">Lv {currentRegion.levelRange[0]}–{currentRegion.levelRange[1]} · {currentRegion.weather}</div>
        </Card>
      </div>

      {/* boss banner */}
      {boss && (
        <Card className="absolute top-24 left-1/2 -translate-x-1/2 p-2 px-4 bg-slate-900/90 border-amber-400/60 backdrop-blur text-center">
          <div className="text-xs font-bold text-amber-300">
            {BOSS_BY_KEY[boss.boss_key]?.emoji} WORLD BOSS · {boss.name} in {REGION_BY_ID[boss.region]?.name}
          </div>
          <div className="w-56 h-2 bg-slate-800 rounded mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${(boss.hp / boss.max_hp) * 100}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Your damage: {myDamage.toLocaleString()}</div>
        </Card>
      )}

      {/* minimap */}
      <div className="absolute bottom-28 right-2 md:bottom-4 md:right-4">
        <div className="grid grid-cols-5 gap-0.5 p-1 bg-slate-900/85 border border-cyan-500/40 rounded backdrop-blur">
          {Array.from({ length: 15 }).map((_, i) => {
            const col = i % 5, row = Math.floor(i / 5);
            const reg = REGIONS.find((r) => r.col === col && r.row === row);
            const known = reg && character.discovered_regions.includes(reg.id);
            const here = reg?.id === currentRegion.id;
            return (
              <button key={i} disabled={!known} onClick={() => reg && fastTravel(reg.id)}
                title={known ? `${reg?.name} — fast travel` : "Undiscovered"}
                className={`w-7 h-7 md:w-9 md:h-9 rounded-sm text-[11px] flex items-center justify-center transition-all ${
                  here ? "ring-2 ring-cyan-300 scale-110" : ""} ${known ? "opacity-100 hover:brightness-125" : "opacity-25"}`}
                style={{ background: known && reg ? reg.ground : "#0b1020" }}>
                {known ? reg?.emoji : "❔"}
              </button>
            );
          })}
        </div>
      </div>

      {/* portal prompt */}
      {nearPortal && (
        <Card className="absolute bottom-44 left-1/2 -translate-x-1/2 p-3 bg-slate-900/90 border-cyan-400 backdrop-blur pointer-events-auto">
          <Button onClick={() => navigate(nearPortal.route)} className="gap-2">{nearPortal.emoji} Enter {nearPortal.name}</Button>
        </Card>
      )}

      {/* skill bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 md:gap-2 flex-wrap justify-center max-w-[92vw]">
        <button onClick={doAttack}
          className="w-14 h-14 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 border-2 border-rose-300 text-2xl shadow-[0_0_18px_rgba(244,63,94,0.5)] active:scale-95">
          {(WEAPON_BY_ID[character.weapon] || WEAPONS[0]).emoji}
        </button>
        {skills.slice(0, 8).map((s, i) => {
          const cd = Math.max(0, (cooldowns.current[s.id] || 0) - now);
          const pct = cd > 0 ? (cd / s.cooldown) * 100 : 0;
          return (
            <button key={s.id} onClick={() => useSkill(s.id)} title={`${s.name} — ${s.desc}`}
              className="relative w-12 h-12 rounded-lg bg-slate-900/90 border-2 border-cyan-500/50 text-xl overflow-hidden active:scale-95">
              <span>{s.emoji}</span>
              <span className="absolute top-0 left-0.5 text-[9px] text-cyan-300">{i + 1}</span>
              {pct > 0 && <div className="absolute inset-x-0 bottom-0 bg-slate-950/80" style={{ height: `${pct}%` }} />}
            </button>
          );
        })}
      </div>

      {/* mobile joystick */}
      <div className="absolute bottom-24 left-4 md:hidden">
        <div
          className="w-32 h-32 rounded-full bg-slate-900/60 border-2 border-cyan-500/40 touch-none"
          onTouchStart={(e) => { joystick.current.active = true; handleStick(e); }}
          onTouchMove={handleStick}
          onTouchEnd={() => { joystick.current.active = false; joystick.current.dx = 0; joystick.current.dy = 0; }}
        >
          <div className="w-full h-full flex items-center justify-center text-cyan-400/60 text-xs">MOVE</div>
        </div>
      </div>

      {/* panels */}
      {panel === "stats" && (
        <Card className="absolute inset-x-2 top-32 md:inset-x-auto md:right-4 md:w-96 max-h-[60vh] overflow-y-auto p-4 bg-slate-900/95 border-cyan-500/50 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-cyan-300">Character · {character.skill_points} skill points</h3>
            <Button size="icon" variant="ghost" onClick={() => setPanel(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1.5">
            {(["max_hp", "attack", "defense", "crit_chance", "move_speed", "luck", "mining", "fishing", "crafting", "woodcutting", "magic"] as StatKey[]).map((s) => (
              <div key={s} className="flex items-center justify-between text-sm bg-slate-800/60 rounded px-2 py-1">
                <span className="capitalize text-slate-300">{s.replace("_", " ")}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-amber-300">{Math.round((character as any)[s] * 10) / 10}</span>
                  <Button size="sm" className="h-6 px-2" disabled={character.skill_points <= 0} onClick={() => spendSkillPoint(s)}>+{STAT_STEP[s]}</Button>
                </span>
              </div>
            ))}
          </div>
          <h4 className="font-bold text-cyan-300 mt-4 mb-2">Weapon</h4>
          <div className="grid grid-cols-2 gap-2">
            {WEAPONS.filter((w) => !w.nft || !character.is_guest).map((w) => (
              <button key={w.id} onClick={() => patch({ weapon: w.id }, true)}
                className={`text-left p-2 rounded border text-xs ${character.weapon === w.id ? "border-cyan-300 bg-cyan-950/50" : "border-slate-700 bg-slate-800/50"}`}>
                <div className="font-bold">{w.emoji} {w.name}</div>
                <div className="text-[10px] text-muted-foreground">{w.desc}</div>
              </button>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => setSelecting(true)}>Change Bull</Button>
        </Card>
      )}

      {panel === "map" && (
        <Card className="absolute inset-x-2 top-32 md:inset-x-auto md:right-4 md:w-96 max-h-[60vh] overflow-y-auto p-4 bg-slate-900/95 border-fuchsia-500/50 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-fuchsia-300">World Map · {character.discovered_regions.length}/{REGIONS.length} discovered</h3>
            <Button size="icon" variant="ghost" onClick={() => setPanel(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1.5">
            {REGIONS.map((r) => {
              const known = character.discovered_regions.includes(r.id);
              return (
                <button key={r.id} disabled={!known} onClick={() => fastTravel(r.id)}
                  className={`w-full text-left p-2 rounded border text-xs ${known ? "border-fuchsia-500/40 bg-slate-800/60 hover:bg-slate-800" : "border-slate-800 bg-slate-900 opacity-40"}`}>
                  <div className="font-bold">{known ? `${r.emoji} ${r.name}` : "❔ Undiscovered"}</div>
                  {known && <div className="text-[10px] text-muted-foreground">{r.description} · Lv {r.levelRange[0]}–{r.levelRange[1]}</div>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* chat */}
      {userId && (
        <div className="absolute bottom-2 left-2 hidden md:block w-72 pointer-events-auto">
          <WorldChat userId={userId} username={username} playerPosition={{ x: p.current.x, y: p.current.y }} onEmoteSent={() => {}} />
        </div>
      )}
    </div>
  );

  function handleStick(e: React.TouchEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const t = e.touches[0];
    const dx = (t.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (t.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const m = Math.hypot(dx, dy) || 1;
    joystick.current.dx = dx / Math.max(1, m);
    joystick.current.dy = dy / Math.max(1, m);
  }
}
