import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { expForLevel, statsForBull } from "@/game/bullworld/combat";
import { SPAWN } from "@/game/bullworld/regions";

export interface BwCharacter {
  id: string;
  user_id: string;
  bull_nft_id: string | null;
  bull_name: string;
  bull_image: string | null;
  is_guest: boolean;
  level: number;
  experience: number;
  skill_points: number;
  hp: number;
  max_hp: number;
  energy: number;
  max_energy: number;
  attack: number;
  defense: number;
  crit_chance: number;
  move_speed: number;
  luck: number;
  mining: number;
  fishing: number;
  crafting: number;
  woodcutting: number;
  magic: number;
  weapon: string;
  gold: number;
  region: string;
  pos_x: number;
  pos_y: number;
  discovered_regions: string[];
}

export type StatKey =
  | "max_hp" | "attack" | "defense" | "crit_chance" | "move_speed"
  | "luck" | "mining" | "fishing" | "crafting" | "woodcutting" | "magic";

const STAT_STEP: Record<StatKey, number> = {
  max_hp: 15, attack: 2, defense: 2, crit_chance: 1, move_speed: 0.2,
  luck: 1, mining: 1, fishing: 1, crafting: 1, woodcutting: 1, magic: 1,
};

/** Loads / creates the player's Bull World character and persists progress. */
export function useBullWorldCharacter(userId: string | null) {
  const [character, setCharacter] = useState<BwCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<number | null>(null);

  const normalize = (row: any): BwCharacter => ({
    ...row,
    discovered_regions: Array.isArray(row.discovered_regions)
      ? row.discovered_regions
      : JSON.parse(row.discovered_regions || '["bull-city"]'),
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bw_characters" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      setCharacter(data ? normalize(data) : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  /** Pick (or re-pick) the bull that becomes the in-world character. */
  const chooseBull = useCallback(
    async (bull: { nft_id: string | null; name: string; image?: string | null; level?: number }) => {
      if (!userId) return null;
      const bullLevel = bull.level || 1;
      const base = statsForBull(bullLevel);
      const payload = {
        user_id: userId,
        bull_nft_id: bull.nft_id,
        bull_name: bull.name,
        bull_image: bull.image || null,
        is_guest: !bull.nft_id,
        level: bullLevel,
        ...base,
        hp: base.max_hp,
        energy: base.max_energy,
        region: "bull-city",
        pos_x: SPAWN.x,
        pos_y: SPAWN.y,
      };
      const { data, error } = await supabase
        .from("bw_characters" as any)
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) { console.error(error); return null; }
      const c = normalize(data);
      setCharacter(c);
      return c;
    },
    [userId]
  );

  /** Optimistic local patch + debounced write. */
  const patch = useCallback((changes: Partial<BwCharacter>, immediate = false) => {
    setCharacter((prev) => (prev ? { ...prev, ...changes } : prev));
    if (!userId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const write = () => {
      supabase.from("bw_characters" as any).update(changes as any).eq("user_id", userId).then(() => {});
    };
    if (immediate) write();
    else saveTimer.current = window.setTimeout(write, 1200);
  }, [userId]);

  /** Award experience and handle level-ups (3 skill points per level). */
  const gainExp = useCallback((amount: number) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      let exp = prev.experience + amount;
      let level = prev.level;
      let points = prev.skill_points;
      while (exp >= expForLevel(level)) {
        exp -= expForLevel(level);
        level += 1;
        points += 3;
      }
      const leveled = level !== prev.level;
      const next = {
        ...prev,
        experience: exp,
        level,
        skill_points: points,
        max_hp: leveled ? prev.max_hp + (level - prev.level) * 15 : prev.max_hp,
        hp: leveled ? prev.max_hp + (level - prev.level) * 15 : prev.hp,
        attack: leveled ? prev.attack + (level - prev.level) * 2 : prev.attack,
      };
      if (userId) {
        supabase.from("bw_characters" as any).update({
          experience: next.experience, level: next.level, skill_points: next.skill_points,
          max_hp: next.max_hp, hp: next.hp, attack: next.attack,
        }).eq("user_id", userId).then(() => {});
      }
      return next;
    });
  }, [userId]);

  const spendSkillPoint = useCallback((stat: StatKey) => {
    setCharacter((prev) => {
      if (!prev || prev.skill_points <= 0) return prev;
      const value = (prev as any)[stat] + STAT_STEP[stat];
      const next: any = { ...prev, [stat]: value, skill_points: prev.skill_points - 1 };
      if (stat === "max_hp") next.hp = Math.min(next.hp + STAT_STEP.max_hp, value);
      if (userId) {
        supabase.from("bw_characters" as any)
          .update({ [stat]: value, skill_points: next.skill_points, hp: next.hp })
          .eq("user_id", userId).then(() => {});
      }
      return next;
    });
  }, [userId]);

  const discoverRegion = useCallback((regionId: string) => {
    setCharacter((prev) => {
      if (!prev || prev.discovered_regions.includes(regionId)) return prev;
      const discovered = [...prev.discovered_regions, regionId];
      if (userId) {
        supabase.from("bw_characters" as any)
          .update({ discovered_regions: discovered, region: regionId })
          .eq("user_id", userId).then(() => {});
      }
      return { ...prev, discovered_regions: discovered, region: regionId };
    });
  }, [userId]);

  return { character, setCharacter, loading, chooseBull, patch, gainExp, spendSkillPoint, discoverRegion, STAT_STEP };
}
