import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords, Shield, Heart } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UNITS = [
  { name: 'Infantry', cost: 30, atk: 10, def: 15, emoji: '🗡️' },
  { name: 'Cavalry', cost: 60, atk: 25, def: 8, emoji: '🐴' },
  { name: 'Archers', cost: 45, atk: 20, def: 5, emoji: '🏹' },
  { name: 'Siege', cost: 100, atk: 40, def: 3, emoji: '🪨' },
];

const BullLegion = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Legion" });
  const [phase, setPhase] = useState<'recruit' | 'battle' | 'result'>('recruit');
  const [gold, setGold] = useState(0);
  const [army, setArmy] = useState<Record<string, number>>({});
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const entryCost = 250;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setGold(400 + bullsOwned * 15);
    setArmy({});
    setBattleLog([]);
    setPhase('recruit');
  };

  const recruit = (name: string, cost: number) => {
    if (gold < cost) return;
    setGold(prev => prev - cost);
    setArmy(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  const fight = async () => {
    const totalAtk = UNITS.reduce((s, u) => s + (army[u.name] || 0) * u.atk, 0);
    const totalDef = UNITS.reduce((s, u) => s + (army[u.name] || 0) * u.def, 0);
    const enemyPower = 150 + Math.floor(Math.random() * 100);
    
    const log: string[] = [];
    log.push(`⚔️ Your army: ATK ${totalAtk} / DEF ${totalDef}`);
    log.push(`👹 Enemy power: ${enemyPower}`);
    
    const victory = totalAtk + totalDef > enemyPower;
    if (victory) {
      const keys = totalAtk > 200 ? 4 : totalAtk > 100 ? 3 : 2;
      log.push(`✅ Victory! Won ${keys} 🔑`);
      await awardKeys(keys);
      setWon(true);
    } else {
      log.push(`❌ Defeated! Your forces were overwhelmed.`);
      setWon(false);
    }
    
    setBattleLog(log);
    setPhase('result');
  };

  const totalUnits = Object.values(army).reduce((s, v) => s + v, 0);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">⚔️ Bull Legion</h1>
          <p className="text-muted-foreground">Recruit your army and crush the enemy!</p>
        </div>

        {phase === 'recruit' && totalUnits === 0 && !gold ? (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Recruit units then battle!</p>
            <Button onClick={start} disabled={isLoading} size="lg">Begin Campaign</Button>
          </div>
        ) : phase === 'recruit' ? (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>🪙 Gold: {gold}</span>
              <span>🪖 Units: {totalUnits}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {UNITS.map(u => (
                <Button key={u.name} onClick={() => recruit(u.name, u.cost)} disabled={gold < u.cost} className="h-auto py-3 flex-col">
                  <span className="text-2xl">{u.emoji}</span>
                  <span className="text-sm font-bold">{u.name} ({u.cost}g)</span>
                  <span className="text-xs">ATK:{u.atk} DEF:{u.def}</span>
                  <span className="text-xs text-muted-foreground">x{army[u.name] || 0}</span>
                </Button>
              ))}
            </div>
            <Button onClick={fight} className="w-full" size="lg" disabled={totalUnits === 0}>⚔️ Attack!</Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{won ? '🏆 Victory!' : '💀 Defeat!'}</p>
            {battleLog.map((l, i) => <p key={i} className="text-muted-foreground">{l}</p>)}
            <Button onClick={() => { setPhase('recruit'); setGold(0); }}>Play Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullLegion;
