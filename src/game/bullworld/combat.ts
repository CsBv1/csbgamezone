/**
 * Bull World — Combat module
 * --------------------------
 * Weapons, skills, enemy templates, world bosses and the damage formulas.
 * Everything is data-driven so new content is a single array entry.
 */

export interface CharacterStats {
  level: number;
  hp: number;
  max_hp: number;
  energy: number;
  max_energy: number;
  attack: number;
  defense: number;
  crit_chance: number;
  move_speed: number;
  luck: number;
  magic: number;
}

/* ------------------------------- WEAPONS -------------------------------- */

export interface Weapon {
  id: string;
  name: string;
  emoji: string;
  damage: number;   // multiplier on attack
  range: number;    // px
  cooldown: number; // ms
  crit: number;     // bonus crit %
  nft?: boolean;
  desc: string;
}

export const WEAPONS: Weapon[] = [
  { id: "sword", name: "Sword", emoji: "🗡️", damage: 1.0, range: 90, cooldown: 520, crit: 0, desc: "Balanced blade. Reliable in every region." },
  { id: "hammer", name: "Hammer", emoji: "🔨", damage: 1.7, range: 80, cooldown: 950, crit: -2, desc: "Slow, brutal, staggers enemies." },
  { id: "axe", name: "Axe", emoji: "🪓", damage: 1.35, range: 85, cooldown: 720, crit: 4, desc: "Heavy chops with bleed potential." },
  { id: "bow", name: "Bow", emoji: "🏹", damage: 0.85, range: 300, cooldown: 620, crit: 6, desc: "Strike from safety at long range." },
  { id: "staff", name: "Magic Staff", emoji: "🪄", damage: 1.1, range: 230, cooldown: 700, crit: 3, desc: "Scales with your Magic skill." },
  { id: "daggers", name: "Daggers", emoji: "🔪", damage: 0.6, range: 70, cooldown: 260, crit: 14, desc: "Blistering speed and huge crit chance." },
  { id: "horn-of-cardano", name: "Horn of Cardano", emoji: "🐂", damage: 2.1, range: 120, cooldown: 800, crit: 12, nft: true, desc: "NFT weapon. Unlocked by holding a CSB Bull." },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

/* -------------------------------- SKILLS -------------------------------- */

export type SkillEffect =
  | { kind: "damage"; power: number; radius: number }
  | { kind: "dash"; distance: number; power: number }
  | { kind: "heal"; amount: number }
  | { kind: "shield"; amount: number; duration: number }
  | { kind: "buff"; attack: number; duration: number }
  | { kind: "teleport"; distance: number }
  | { kind: "summon"; power: number; duration: number };

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  cooldown: number;   // ms
  energy: number;
  unlockLevel: number;
  effect: SkillEffect;
  desc: string;
}

export const SKILLS: Skill[] = [
  { id: "bull-charge", name: "Bull Charge", emoji: "💨", cooldown: 6000, energy: 12, unlockLevel: 1, effect: { kind: "dash", distance: 320, power: 1.6 }, desc: "Charge forward, trampling everything in the path." },
  { id: "horn-strike", name: "Horn Strike", emoji: "🐂", cooldown: 4000, energy: 8, unlockLevel: 2, effect: { kind: "damage", power: 1.8, radius: 120 }, desc: "A vicious close-range gore." },
  { id: "ground-slam", name: "Ground Slam", emoji: "🌊", cooldown: 9000, energy: 18, unlockLevel: 4, effect: { kind: "damage", power: 2.2, radius: 230 }, desc: "Shockwave damaging all nearby enemies." },
  { id: "shield-wall", name: "Shield Wall", emoji: "🛡️", cooldown: 14000, energy: 15, unlockLevel: 6, effect: { kind: "shield", amount: 60, duration: 6000 }, desc: "Absorb incoming damage for 6 seconds." },
  { id: "healing-aura", name: "Healing Aura", emoji: "💚", cooldown: 16000, energy: 20, unlockLevel: 8, effect: { kind: "heal", amount: 45 }, desc: "Restore health to yourself." },
  { id: "fireball", name: "Fireball", emoji: "🔥", cooldown: 5000, energy: 14, unlockLevel: 10, effect: { kind: "damage", power: 2.0, radius: 150 }, desc: "Hurl magical fire. Scales with Magic." },
  { id: "ice-storm", name: "Ice Storm", emoji: "🧊", cooldown: 12000, energy: 22, unlockLevel: 13, effect: { kind: "damage", power: 2.6, radius: 300 }, desc: "Freeze a wide area, slowing enemies." },
  { id: "lightning-chain", name: "Lightning Chain", emoji: "⚡", cooldown: 10000, energy: 20, unlockLevel: 16, effect: { kind: "damage", power: 2.4, radius: 380 }, desc: "Arcs between multiple targets." },
  { id: "berserk", name: "Berserk Mode", emoji: "😤", cooldown: 30000, energy: 30, unlockLevel: 18, effect: { kind: "buff", attack: 1.8, duration: 10000 }, desc: "Massive attack boost for 10 seconds." },
  { id: "teleport", name: "Teleport", emoji: "🌀", cooldown: 15000, energy: 16, unlockLevel: 20, effect: { kind: "teleport", distance: 700 }, desc: "Blink a long distance instantly." },
  { id: "summon-companion", name: "Summon Companion", emoji: "🐾", cooldown: 45000, energy: 35, unlockLevel: 24, effect: { kind: "summon", power: 1.2, duration: 20000 }, desc: "Call a spirit calf to fight beside you." },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export function unlockedSkills(level: number) {
  return SKILLS.filter((s) => s.unlockLevel <= level);
}

/* -------------------------------- ENEMIES ------------------------------- */

export type AIState = "patrol" | "chase" | "attack" | "retreat" | "defend";

export interface EnemyTemplate {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  exp: number;
  gold: number;
  color: string;
}

const E = (
  id: string, name: string, emoji: string, hp: number, attack: number,
  defense: number, speed: number, exp: number, gold: number, color: string,
  opts: Partial<EnemyTemplate> = {}
): EnemyTemplate => ({
  id, name, emoji, hp, attack, defense, speed,
  aggroRange: 380, attackRange: 70, attackCooldown: 1300,
  exp, gold, color, ...opts,
});

export const ENEMIES: EnemyTemplate[] = [
  E("wild-calf", "Wild Calf", "🐄", 45, 6, 2, 1.6, 12, 3, "#a3e635"),
  E("meadow-wolf", "Meadow Wolf", "🐺", 70, 10, 3, 2.4, 20, 6, "#84cc16"),
  E("shard-sprite", "Shard Sprite", "✨", 90, 14, 6, 2.2, 34, 11, "#7df9ff", { attackRange: 190 }),
  E("forest-stalker", "Forest Stalker", "🦎", 140, 18, 8, 2.6, 48, 15, "#22d3ee"),
  E("frost-wolf", "Frost Wolf", "🐺", 190, 24, 11, 2.8, 70, 22, "#bfe9ff"),
  E("ice-revenant", "Ice Revenant", "👻", 260, 30, 16, 1.9, 96, 30, "#e0f2fe"),
  E("sand-raider", "Sand Raider", "🗡️", 175, 22, 10, 2.7, 66, 24, "#e8c96a"),
  E("dune-scorpion", "Dune Scorpion", "🦂", 210, 27, 14, 2.2, 82, 27, "#f59e0b"),
  E("corsair-bull", "Corsair Bull", "🏴‍☠️", 160, 20, 9, 2.5, 60, 26, "#4fd1c5"),
  E("reef-crab", "Reef Crab", "🦀", 230, 17, 22, 1.4, 64, 20, "#2dd4bf", { aggroRange: 240 }),
  E("bog-lurker", "Bog Lurker", "🐊", 280, 32, 15, 2.1, 105, 34, "#9be36b"),
  E("witch-toad", "Witch Toad", "🐸", 205, 36, 10, 1.8, 98, 36, "#65a30d", { attackRange: 220 }),
  E("ruin-guardian", "Ruin Guardian", "🗿", 340, 30, 26, 1.5, 120, 40, "#d9c37a", { aggroRange: 300 }),
  E("cursed-priest", "Cursed Priest", "🕯️", 250, 40, 12, 2.0, 128, 45, "#fcd34d", { attackRange: 260 }),
  E("magma-hound", "Magma Hound", "🔥", 320, 44, 18, 3.0, 150, 52, "#ff6a2b"),
  E("ember-golem", "Ember Golem", "🌋", 480, 52, 34, 1.5, 195, 70, "#ef4444"),
  E("storm-harpy", "Storm Harpy", "🦅", 380, 56, 20, 3.4, 210, 76, "#a9c8ff", { attackRange: 200 }),
  E("cloud-titan", "Cloud Titan", "☁️", 620, 64, 40, 1.7, 280, 100, "#c7d2fe"),
  E("shade-bull", "Shade Bull", "🌑", 540, 70, 30, 2.9, 300, 110, "#8b5cf6"),
  E("abyss-warden", "Abyss Warden", "👁️", 760, 82, 46, 2.0, 400, 150, "#6d28d9"),
  E("arena-champion", "Arena Champion", "🏆", 400, 48, 28, 2.6, 220, 90, "#ff4d6d"),
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

/* ------------------------------ WORLD BOSSES ---------------------------- */

export interface BossTemplate {
  key: string;
  name: string;
  emoji: string;
  region: string;
  level: number;
  hp: number;
  attack: number;
  color: string;
  reward: { diamonds: number; gold: number; exp: number };
  desc: string;
}

export const BOSSES: BossTemplate[] = [
  { key: "golden-bull", name: "Golden Bull", emoji: "🐂", region: "green-meadows", level: 15, hp: 40000, attack: 45, color: "#ffd700", reward: { diamonds: 500, gold: 400, exp: 900 }, desc: "The legendary founder beast." },
  { key: "shadow-bull", name: "Shadow Bull", emoji: "🌑", region: "dungeon-entrance", level: 30, hp: 90000, attack: 85, color: "#8b5cf6", reward: { diamonds: 1200, gold: 900, exp: 2200 }, desc: "Born from the abyss gate." },
  { key: "crypto-dragon", name: "Crypto Dragon", emoji: "🐉", region: "sky-islands", level: 35, hp: 120000, attack: 100, color: "#38bdf8", reward: { diamonds: 1800, gold: 1300, exp: 3200 }, desc: "Hoards keys, diamonds and secrets." },
  { key: "mountain-titan", name: "Mountain Titan", emoji: "🌋", region: "lava-mountains", level: 28, hp: 80000, attack: 78, color: "#ff6a2b", reward: { diamonds: 1000, gold: 800, exp: 2000 }, desc: "A living volcano with fists." },
  { key: "ocean-kraken", name: "Ocean Kraken", emoji: "🦑", region: "pirate-coast", level: 22, hp: 60000, attack: 60, color: "#2dd4bf", reward: { diamonds: 750, gold: 600, exp: 1500 }, desc: "Rises when the storm peaks." },
];

export const BOSS_BY_KEY = Object.fromEntries(BOSSES.map((b) => [b.key, b]));

/* ------------------------------- FORMULAS ------------------------------- */

export function expForLevel(level: number) {
  return Math.floor(100 * Math.pow(level, 1.55));
}

export function statsForBull(level: number, rarityBonus = 0) {
  return {
    max_hp: Math.floor(100 + level * 18 + rarityBonus),
    max_energy: Math.floor(100 + level * 6),
    attack: Math.floor(10 + level * 3.2 + rarityBonus * 0.2),
    defense: Math.floor(5 + level * 2.1),
    crit_chance: Math.min(45, 5 + level * 0.4),
    move_speed: 5 + Math.min(3, level * 0.05),
  };
}

export function rollDamage(
  attack: number, weapon: Weapon, targetDefense: number,
  critChance: number, power = 1, magic = 1
) {
  const magicBonus = weapon.id === "staff" ? 1 + magic * 0.04 : 1;
  const base = attack * weapon.damage * power * magicBonus;
  const mitigated = Math.max(base * 0.25, base - targetDefense * 0.6);
  const crit = Math.random() * 100 < critChance + weapon.crit;
  const jitter = 0.88 + Math.random() * 0.24;
  return { damage: Math.max(1, Math.round(mitigated * jitter * (crit ? 2 : 1))), crit };
}

export function enemyDamage(enemyAttack: number, playerDefense: number) {
  const base = enemyAttack * (0.9 + Math.random() * 0.3);
  return Math.max(1, Math.round(Math.max(base * 0.2, base - playerDefense * 0.5)));
}

/** Deterministic pseudo-random so enemy camps are stable per world cell. */
export function hash2(x: number, y: number, salt = 0) {
  let h = x * 374761393 + y * 668265263 + salt * 2654435761;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
