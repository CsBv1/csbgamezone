import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Csbv1Player {
  balance: number;
  total_earned: number;
  energy: number;
  max_energy: number;
  energy_updated_at: string;
  last_claim_at: string | null;
  streak_days: number;
  last_streak_date: string | null;
}

const ENERGY_REGEN_PER_MIN = 1; // 1 energy per minute

/** Compute current energy based on stored value + elapsed regen */
export function computeEnergy(p: Pick<Csbv1Player, "energy" | "max_energy" | "energy_updated_at">): number {
  const last = new Date(p.energy_updated_at).getTime();
  const minutes = Math.max(0, (Date.now() - last) / 60000);
  return Math.min(p.max_energy, Math.floor(p.energy + minutes * ENERGY_REGEN_PER_MIN));
}

export function useCsbv1() {
  const [player, setPlayer] = useState<Csbv1Player | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPlayer(null); setLoading(false); return; }
    setUserId(user.id);

    let { data } = await supabase
      .from("csbv1_players" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      const ins = await supabase
        .from("csbv1_players" as any)
        .insert({ user_id: user.id })
        .select()
        .single();
      data = ins.data;
    }
    setPlayer(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Tick energy display every 30s
  useEffect(() => {
    const i = setInterval(() => setPlayer((p) => p ? { ...p } : p), 30000);
    return () => clearInterval(i);
  }, []);

  const currentEnergy = player ? computeEnergy(player) : 0;

  const updatePlayer = useCallback(async (patch: Partial<Csbv1Player>) => {
    if (!userId || !player) return;
    const merged = { ...player, ...patch };
    setPlayer(merged);
    await supabase.from("csbv1_players" as any).update(patch).eq("user_id", userId);
  }, [userId, player]);

  /** Spend energy (returns true on success). Persists current regen first. */
  const spendEnergy = useCallback(async (amount: number) => {
    if (!player || !userId) return false;
    const cur = computeEnergy(player);
    if (cur < amount) return false;
    const newEnergy = cur - amount;
    await updatePlayer({ energy: newEnergy, energy_updated_at: new Date().toISOString() });
    return true;
  }, [player, userId, updatePlayer]);

  const addBalance = useCallback(async (amount: number) => {
    if (!player || !userId) return;
    await updatePlayer({
      balance: player.balance + amount,
      total_earned: player.total_earned + Math.max(0, amount),
    });
  }, [player, userId, updatePlayer]);

  const spendBalance = useCallback(async (amount: number) => {
    if (!player || !userId) return false;
    if (player.balance < amount) return false;
    await updatePlayer({ balance: player.balance - amount });
    return true;
  }, [player, userId, updatePlayer]);

  return {
    player, userId, loading, currentEnergy,
    refresh, updatePlayer, spendEnergy, addBalance, spendBalance,
  };
}
