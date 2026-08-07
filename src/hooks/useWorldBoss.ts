import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BOSSES, BOSS_BY_KEY } from "@/game/bullworld/combat";
import { REGION_BY_ID, regionBounds } from "@/game/bullworld/regions";

export interface WorldBoss {
  id: string;
  boss_key: string;
  name: string;
  region: string;
  level: number;
  hp: number;
  max_hp: number;
  pos_x: number;
  pos_y: number;
  status: string;
  despawn_at: string;
}

/**
 * Shared world boss. One boss is alive at a time; anyone can damage it and
 * everyone who contributed shares the reward. Synced via realtime + polling.
 */
export function useWorldBoss(userId: string | null, username: string | null) {
  const [boss, setBoss] = useState<WorldBoss | null>(null);
  const [myDamage, setMyDamage] = useState(0);
  const bossRef = useRef<WorldBoss | null>(null);
  bossRef.current = boss;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("bw_world_bosses" as any)
      .select("*")
      .eq("status", "alive")
      .gt("despawn_at", new Date().toISOString())
      .order("spawned_at", { ascending: false })
      .limit(1);
    const row = (data as any)?.[0] as WorldBoss | undefined;
    if (row) { setBoss(row); return row; }
    return null;
  }, []);

  const spawnIfNeeded = useCallback(async () => {
    const alive = await load();
    if (alive) return alive;
    const tpl = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const b = regionBounds(REGION_BY_ID[tpl.region]);
    const { data } = await supabase
      .from("bw_world_bosses" as any)
      .insert({
        boss_key: tpl.key, name: tpl.name, region: tpl.region, level: tpl.level,
        hp: tpl.hp, max_hp: tpl.hp,
        pos_x: b.cx + (Math.random() - 0.5) * 800,
        pos_y: b.cy + (Math.random() - 0.5) * 800,
      })
      .select()
      .single();
    if (data) setBoss(data as any);
    return (data as any) || null;
  }, [load]);

  useEffect(() => {
    spawnIfNeeded();
    const channel = supabase
      .channel("bw-world-boss")
      .on("postgres_changes", { event: "*", schema: "public", table: "bw_world_bosses" }, (p) => {
        const row = p.new as any;
        if (!row?.id) return;
        if (row.status !== "alive") { setBoss(null); return; }
        setBoss(row);
      })
      .subscribe();
    const poll = window.setInterval(() => { load(); }, 8000);
    return () => { supabase.removeChannel(channel); window.clearInterval(poll); };
  }, [load, spawnIfNeeded]);

  /** Apply damage to the shared boss and log the contribution. */
  const damageBoss = useCallback(async (amount: number) => {
    const current = bossRef.current;
    if (!current || !userId) return;
    const nextHp = Math.max(0, current.hp - amount);
    setBoss({ ...current, hp: nextHp });
    setMyDamage((d) => d + amount);

    await supabase.from("bw_world_bosses" as any)
      .update({ hp: nextHp, status: nextHp <= 0 ? "defeated" : "alive" })
      .eq("id", current.id).gt("hp", 0);

    await supabase.from("bw_boss_damage" as any).upsert(
      { boss_id: current.id, user_id: userId, username, damage: myDamage + amount },
      { onConflict: "boss_id,user_id" }
    );
  }, [userId, username, myDamage]);

  const template = boss ? BOSS_BY_KEY[boss.boss_key] : null;
  return { boss, template, myDamage, damageBoss, spawnIfNeeded };
}
