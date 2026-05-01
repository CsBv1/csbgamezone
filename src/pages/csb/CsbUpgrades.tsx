import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Zap, Timer, Coins } from "lucide-react";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeDef {
  id: string;
  title: string;
  description: string;
  icon: any;
  baseCost: number;
  effect: (lvl: number) => string;
  apply: (lvl: number) => Partial<{ max_energy: number }>;
  color: string;
}

const UPGRADES: UpgradeDef[] = [
  {
    id: "reward_boost", title: "Reward Boost", description: "Increase claim & mission rewards",
    icon: TrendingUp, baseCost: 100, effect: (l) => `+${l * 10}% rewards`,
    apply: () => ({}), color: "from-amber-600 to-orange-700 border-amber-500/50",
  },
  {
    id: "energy_capacity", title: "Energy Capacity", description: "Increase max energy",
    icon: Zap, baseCost: 150, effect: (l) => `${100 + l * 20} max`,
    apply: (l) => ({ max_energy: 100 + l * 20 }), color: "from-cyan-600 to-blue-700 border-cyan-500/50",
  },
  {
    id: "cooldown_reduction", title: "Cooldown Reduction", description: "Faster claim cooldown",
    icon: Timer, baseCost: 200, effect: (l) => `-${l * 5} min cooldown`,
    apply: () => ({}), color: "from-fuchsia-600 to-purple-700 border-fuchsia-500/50",
  },
];

const costFor = (base: number, level: number) => Math.floor(base * Math.pow(1.6, level));

const CsbUpgrades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { player, userId, spendBalance, updatePlayer } = useCsbv1();
  const [levels, setLevels] = useState<Record<string, number>>({});

  const load = async () => {
    if (!userId) return;
    const { data } = await supabase.from("csbv1_upgrades" as any).select("*").eq("user_id", userId);
    const m: Record<string, number> = {};
    (data || []).forEach((r: any) => { m[r.upgrade_type] = r.level; });
    setLevels(m);
  };
  useEffect(() => { load(); }, [userId]);

  const buy = async (u: UpgradeDef) => {
    if (!userId || !player) return;
    const lvl = levels[u.id] || 0;
    const cost = costFor(u.baseCost, lvl);
    if (player.balance < cost) { toast({ title: "Not enough $CsBv1", variant: "destructive" }); return; }
    const ok = await spendBalance(cost);
    if (!ok) return;

    const newLvl = lvl + 1;
    await supabase.from("csbv1_upgrades" as any).upsert({
      user_id: userId, upgrade_type: u.id, level: newLvl,
    }, { onConflict: "user_id,upgrade_type" });

    const patch = u.apply(newLvl);
    if (Object.keys(patch).length) await updatePlayer(patch as any);

    toast({ title: `${u.title} → Lv ${newLvl}`, description: u.effect(newLvl) });
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/csb")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>

        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">UPGRADES</h1>
          <div className="flex items-center justify-center gap-2 mt-2 text-amber-300">
            <Coins className="w-5 h-5" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {UPGRADES.map((u) => {
            const lvl = levels[u.id] || 0;
            const cost = costFor(u.baseCost, lvl);
            const can = (player?.balance || 0) >= cost;
            const Icon = u.icon;
            return (
              <Card key={u.id} className={`p-5 bg-gradient-to-br ${u.color} border-2 ${can ? "shadow-[0_0_25px_rgba(255,255,255,0.15)]" : ""}`}>
                <Icon className="w-10 h-10 mb-3 opacity-90" />
                <h3 className="text-lg font-bold">{u.title}</h3>
                <p className="text-xs opacity-80 mb-3">{u.description}</p>
                <div className="text-xs uppercase tracking-wider opacity-70">Level {lvl}</div>
                <Progress value={Math.min(100, lvl * 10)} className="h-2 my-2" />
                <div className="text-sm font-semibold mb-1">Next: {u.effect(lvl + 1)}</div>
                <div className="text-xs opacity-90 mb-3 flex items-center gap-1"><Coins className="w-3 h-3" /> {cost.toLocaleString()} $CsBv1</div>
                <Button size="sm" className="w-full" disabled={!can} onClick={() => buy(u)}>
                  {can ? "Upgrade" : "Need more $CsBv1"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CsbUpgrades;
