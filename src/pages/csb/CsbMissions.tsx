import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Target, Zap, Coins, CheckCircle2, Flame } from "lucide-react";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MissionDef {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  energyCost: number;
  reward: number;
  goal: number;
}

const MISSIONS: MissionDef[] = [
  { id: "easy_action", title: "Quick Tap",       description: "Complete 1 action", difficulty: "easy",   energyCost: 5,  reward: 5,  goal: 1 },
  { id: "easy_double", title: "Double Up",       description: "Complete 2 actions", difficulty: "easy",  energyCost: 8,  reward: 10, goal: 2 },
  { id: "med_energy",  title: "Burn 20 Energy",  description: "Spend 20 energy",   difficulty: "medium", energyCost: 20, reward: 15, goal: 1 },
  { id: "med_combo",   title: "Combo Strike",    description: "Complete 5 actions", difficulty: "medium", energyCost: 15, reward: 25, goal: 5 },
  { id: "hard_three",  title: "Triple Conquest", description: "Complete 3 missions chain", difficulty: "hard", energyCost: 30, reward: 50, goal: 3 },
  { id: "hard_grind",  title: "Marathon",        description: "Complete 10 actions", difficulty: "hard", energyCost: 40, reward: 80, goal: 10 },
];

const diffColor: Record<string, string> = {
  easy: "from-emerald-600 to-teal-700 border-emerald-500/50",
  medium: "from-amber-600 to-orange-700 border-amber-500/50",
  hard: "from-rose-600 to-fuchsia-700 border-rose-500/50",
};

const CsbMissions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { player, userId, currentEnergy, spendEnergy, addBalance } = useCsbv1();
  const [progress, setProgress] = useState<Record<string, { progress: number; completed: boolean; claimed: boolean }>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const loadProgress = async () => {
    if (!userId) return;
    const { data } = await supabase.from("csbv1_missions" as any)
      .select("*").eq("user_id", userId).eq("reset_date", today);
    const map: Record<string, any> = {};
    (data || []).forEach((r: any) => { map[r.mission_id] = { progress: r.progress, completed: r.completed, claimed: r.claimed }; });
    setProgress(map);
  };

  useEffect(() => { loadProgress(); }, [userId]);

  // streak
  const streak = player?.streak_days || 0;
  const streakMultiplier = 1 + Math.min(streak * 0.05, 0.5); // up to 1.5x at 10 days

  // Countdown to midnight (reset)
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  const cd = tomorrow.getTime() - now;
  const ch = Math.floor(cd / 3600000);
  const cm = Math.floor((cd % 3600000) / 60000);
  const cs = Math.floor((cd % 60000) / 1000);

  const startMission = async (m: MissionDef) => {
    if (!userId) return;
    if (currentEnergy < m.energyCost) { toast({ title: "Not enough energy ⚡", variant: "destructive" }); return; }
    const ok = await spendEnergy(m.energyCost);
    if (!ok) return;

    const cur = progress[m.id]?.progress || 0;
    const newProg = Math.min(m.goal, cur + 1);
    const completed = newProg >= m.goal;

    await supabase.from("csbv1_missions" as any).upsert({
      user_id: userId, mission_id: m.id, reset_date: today,
      progress: newProg, completed, claimed: false,
    }, { onConflict: "user_id,mission_id,reset_date" });

    toast({ title: completed ? `✅ ${m.title} complete!` : `Progress ${newProg}/${m.goal}`, description: `-${m.energyCost} ⚡` });
    loadProgress();
  };

  const claimMission = async (m: MissionDef) => {
    if (!userId) return;
    const reward = Math.floor(m.reward * streakMultiplier);
    await addBalance(reward);
    await supabase.from("csbv1_missions" as any).update({ claimed: true })
      .eq("user_id", userId).eq("mission_id", m.id).eq("reset_date", today);

    // bump streak (once per day on first claim of the day)
    if (player && player.last_streak_date !== today) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      const newStreak = player.last_streak_date === yestStr ? streak + 1 : 1;
      await supabase.from("csbv1_players" as any).update({
        streak_days: newStreak, last_streak_date: today,
      }).eq("user_id", userId);
    }

    toast({ title: `+${reward} $CsBv1 🎉`, description: `Streak x${streakMultiplier.toFixed(2)}` });
    loadProgress();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/csb")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>

        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">DAILY MISSIONS</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset in {String(ch).padStart(2,'0')}:{String(cm).padStart(2,'0')}:{String(cs).padStart(2,'0')}</p>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-cyan-400"><Zap className="w-4 h-4" /> {currentEnergy}/{player?.max_energy || 100}</div>
          <div className="flex items-center gap-2 text-orange-400"><Flame className="w-4 h-4" /> {streak} day streak (x{streakMultiplier.toFixed(2)})</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MISSIONS.map((m) => {
            const p = progress[m.id] || { progress: 0, completed: false, claimed: false };
            const pct = (p.progress / m.goal) * 100;
            return (
              <Card key={m.id} className={`p-5 bg-gradient-to-br ${diffColor[m.difficulty]} border-2 ${p.claimed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider opacity-80">{m.difficulty}</div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Target className="w-4 h-4" /> {m.title}
                      {p.completed && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-300 font-bold"><Coins className="w-3 h-3" /> {Math.floor(m.reward * streakMultiplier)}</div>
                    <div className="flex items-center gap-1 text-cyan-200 text-xs"><Zap className="w-3 h-3" /> {m.energyCost}</div>
                  </div>
                </div>
                <p className="text-sm opacity-90 mb-3">{m.description}</p>
                <Progress value={pct} className="h-2 mb-3" />
                <div className="text-xs opacity-80 mb-3">{p.progress}/{m.goal}</div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={p.completed || currentEnergy < m.energyCost} onClick={() => startMission(m)}>
                    {p.completed ? "Done" : "Start"}
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1" disabled={!p.completed || p.claimed} onClick={() => claimMission(m)}>
                    {p.claimed ? "Claimed" : "Claim"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CsbMissions;
