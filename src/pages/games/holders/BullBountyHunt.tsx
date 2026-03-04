import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Crosshair, ShieldCheck } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const targets = [
  { name: 'Shadow Bull', bounty: 30, difficulty: 0.4 },
  { name: 'Rogue Miner', bounty: 50, difficulty: 0.5 },
  { name: 'Chain Bandit', bounty: 80, difficulty: 0.6 },
  { name: 'Crypto Phantom', bounty: 120, difficulty: 0.7 },
  { name: 'ADA Warlord', bounty: 200, difficulty: 0.8 },
];

const BullBountyHunt = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Bounty Hunt" });
  const [phase, setPhase] = useState<'board' | 'tracking' | 'confrontation' | 'result'>('board');
  const [target, setTarget] = useState(targets[0]);
  const [clues, setClues] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [totalBounty, setTotalBounty] = useState(0);
  const [hunts, setHunts] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 200;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setStamina(100 + bullsOwned * 5);
    setTotalBounty(0);
    setHunts(0);
    setLog([]);
    pickTarget();
    setPhase('tracking');
  };

  const pickTarget = () => {
    setTarget(targets[Math.min(hunts, targets.length - 1)]);
    setClues(0);
  };

  const track = (method: 'search' | 'interrogate' | 'ambush') => {
    let clueGain = 0, staminaCost = 0;
    const roll = Math.random();

    switch (method) {
      case 'search': clueGain = roll > 0.3 ? 2 : 1; staminaCost = 10; break;
      case 'interrogate': clueGain = roll > 0.5 ? 3 : 0; staminaCost = 15; break;
      case 'ambush': clueGain = roll > 0.6 ? 4 : 0; staminaCost = 25; break;
    }

    setClues(prev => prev + clueGain);
    setStamina(prev => Math.max(0, prev - staminaCost));
    setLog(prev => [...prev, `${method}: +${clueGain} clues, -${staminaCost} stamina`]);

    if (clues + clueGain >= 5) setPhase('confrontation');
    else if (stamina - staminaCost <= 0) finishHunting();
  };

  const confront = (approach: 'force' | 'stealth') => {
    const bonus = bullsOwned * 0.02;
    const success = approach === 'force'
      ? Math.random() + bonus > target.difficulty
      : Math.random() + bonus + 0.1 > target.difficulty;

    if (success) {
      setTotalBounty(prev => prev + target.bounty);
      setLog(prev => [...prev, `✅ Captured ${target.name}! +${target.bounty} bounty`]);
      setHunts(prev => prev + 1);
      if (hunts + 1 >= 5) finishHunting();
      else { pickTarget(); setPhase('tracking'); }
    } else {
      setStamina(prev => Math.max(0, prev - 30));
      setLog(prev => [...prev, `❌ ${target.name} escaped! -30 stamina`]);
      if (stamina - 30 <= 0) finishHunting();
      else { setClues(0); setPhase('tracking'); }
    }
  };

  const finishHunting = async () => {
    const keys = totalBounty >= 300 ? 5 : totalBounty >= 150 ? 3 : totalBounty >= 50 ? 1 : 0;
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🎯 Bull Bounty Hunt</h1>
          <p className="text-muted-foreground">Track down targets, collect bounties!</p>
        </div>

        {phase === 'board' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Hunt 5 targets</p>
            <Button onClick={start} disabled={isLoading} size="lg">Accept Bounties</Button>
          </div>
        )}

        {phase === 'tracking' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>🎯 {target.name}</span>
              <span>🔍 Clues: {clues}/5</span>
              <span>⚡ Stamina: {stamina}</span>
              <span>💰 Bounty: {totalBounty}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => track('search')} className="h-16 flex-col"><Search className="w-5 h-5 mb-1" />Search<span className="text-xs">Safe, steady</span></Button>
              <Button onClick={() => track('interrogate')} className="h-16 flex-col"><ShieldCheck className="w-5 h-5 mb-1" />Interrogate<span className="text-xs">Risky, fast</span></Button>
              <Button onClick={() => track('ambush')} className="h-16 flex-col"><Crosshair className="w-5 h-5 mb-1" />Ambush<span className="text-xs">All or nothing</span></Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">{log.slice(-4).map((l, i) => <div key={i}>{l}</div>)}</div>
          </div>
        )}

        {phase === 'confrontation' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold">Found {target.name}!</p>
            <p>Bounty: {target.bounty} • Difficulty: {Math.round(target.difficulty * 100)}%</p>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => confront('force')} size="lg">⚔️ Force</Button>
              <Button onClick={() => confront('stealth')} size="lg">🤫 Stealth (+10% success)</Button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{totalBounty >= 300 ? '🏆 Legendary Hunter!' : totalBounty >= 150 ? '⭐ Top Hunter' : '🎯 Hunt Over'}</p>
            <p>Total Bounty: {totalBounty} • Hunts: {hunts}</p>
            <Button onClick={() => setPhase('board')}>New Hunt</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullBountyHunt;
