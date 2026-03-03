import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Zap } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const StakeRoyale = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Stake Royale" });
  const [phase, setPhase] = useState<'lobby' | 'battle' | 'result'>('lobby');
  const [hp, setHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(0);
  const [round, setRound] = useState(1);
  const [kills, setKills] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 300;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setHp(100 + bullsOwned * 5);
    setEnemyHp(50 + Math.floor(Math.random() * 30));
    setRound(1);
    setKills(0);
    setLog([]);
    setPhase('battle');
  };

  const attack = (type: 'quick' | 'heavy' | 'counter') => {
    let dmg = 0, taken = 0;
    const enemyAction = Math.random();

    switch (type) {
      case 'quick':
        dmg = 10 + Math.floor(Math.random() * 10);
        taken = enemyAction > 0.5 ? 8 + Math.floor(Math.random() * 8) : 0;
        break;
      case 'heavy':
        dmg = Math.random() > 0.4 ? 25 + Math.floor(Math.random() * 15) : 5;
        taken = 10 + Math.floor(Math.random() * 12);
        break;
      case 'counter':
        dmg = enemyAction > 0.5 ? 20 + Math.floor(Math.random() * 10) : 0;
        taken = enemyAction > 0.5 ? 0 : 15;
        break;
    }

    const newEnemyHp = Math.max(0, enemyHp - dmg);
    const newHp = Math.max(0, hp - taken);
    setEnemyHp(newEnemyHp);
    setHp(newHp);
    setLog(prev => [...prev, `R${round}: ${type} → dealt ${dmg}, took ${taken}`]);

    if (newHp <= 0) {
      finishGame(kills);
    } else if (newEnemyHp <= 0) {
      const newKills = kills + 1;
      setKills(newKills);
      if (newKills >= 5) {
        finishGame(newKills);
      } else {
        setEnemyHp(50 + newKills * 20 + Math.floor(Math.random() * 30));
        setRound(prev => prev + 1);
      }
    } else {
      setRound(prev => prev + 1);
    }
  };

  const finishGame = async (finalKills: number) => {
    const keys = finalKills >= 5 ? 5 : finalKills >= 3 ? 3 : finalKills >= 1 ? 1 : 0;
    if (keys > 0) await awardKeys(keys);
    setPhase('result');
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">👑 Stake Royale</h1>
          <p className="text-muted-foreground">Battle 5 opponents to win the crown!</p>
        </div>

        {phase === 'lobby' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Defeat enemies in combat!</p>
            <Button onClick={start} disabled={isLoading} size="lg">Enter Arena</Button>
          </div>
        )}

        {phase === 'battle' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>❤️ You: {hp}</span>
              <span>Kills: {kills}/5</span>
              <span>👹 Enemy: {enemyHp}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => attack('quick')} className="h-16 flex-col"><Zap className="w-5 h-5" />Quick<span className="text-xs">Fast, safe</span></Button>
              <Button onClick={() => attack('heavy')} className="h-16 flex-col"><Crown className="w-5 h-5" />Heavy<span className="text-xs">Big damage, risky</span></Button>
              <Button onClick={() => attack('counter')} className="h-16 flex-col">🛡️ Counter<span className="text-xs">Punish attacks</span></Button>
            </div>
            <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
              {log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{kills >= 5 ? '👑 Champion!' : hp <= 0 ? '💀 Defeated!' : `⚔️ ${kills} Kills`}</p>
            <Button onClick={() => setPhase('lobby')}>Play Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StakeRoyale;
