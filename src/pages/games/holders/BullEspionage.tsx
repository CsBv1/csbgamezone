import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Shield, Target } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BullEspionage = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Espionage" });
  const [phase, setPhase] = useState<'planning' | 'infiltrating' | 'extracting' | 'result'>('planning');
  const [intel, setIntel] = useState(0);
  const [suspicion, setSuspicion] = useState(0);
  const [round, setRound] = useState(1);
  const [actions, setActions] = useState<string[]>([]);
  const maxRounds = 6;
  const entryCost = 200;

  const startMission = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setPhase('infiltrating');
    setIntel(0);
    setSuspicion(0);
    setRound(1);
    setActions([]);
  };

  const doAction = (action: 'hack' | 'sneak' | 'disguise' | 'bribe') => {
    let intelGain = 0, suspGain = 0;
    const roll = Math.random();

    switch (action) {
      case 'hack': intelGain = roll > 0.3 ? 25 : 10; suspGain = roll > 0.6 ? 15 : 30; break;
      case 'sneak': intelGain = roll > 0.5 ? 20 : 5; suspGain = roll > 0.4 ? 5 : 10; break;
      case 'disguise': intelGain = 15; suspGain = roll > 0.7 ? 0 : 5; break;
      case 'bribe': intelGain = roll > 0.4 ? 30 : 0; suspGain = roll > 0.5 ? 20 : 10; break;
    }

    const bullBonus = Math.floor(bullsOwned / 3);
    intelGain += bullBonus;

    setIntel(prev => Math.min(100, prev + intelGain));
    setSuspicion(prev => Math.min(100, prev + suspGain));
    setActions(prev => [...prev, `R${round}: ${action} → +${intelGain} intel, +${suspGain} suspicion`]);

    if (suspicion + suspGain >= 100) {
      setPhase('result');
      return;
    }

    if (round >= maxRounds || intel + intelGain >= 100) {
      setPhase('extracting');
    } else {
      setRound(prev => prev + 1);
    }
  };

  const extract = async () => {
    const keysWon = intel >= 80 ? 3 : intel >= 50 ? 2 : intel >= 30 ? 1 : 0;
    if (keysWon > 0) await awardKeys(keysWon);
    setPhase('result');
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🕵️ Bull Espionage</h1>
          <p className="text-muted-foreground">Infiltrate rival vaults. Gather intel. Don't get caught!</p>
        </div>

        {phase === 'planning' && (
          <div className="text-center space-y-4">
            <p>Cost: {entryCost} 💰 • 6 rounds to gather intel</p>
            <Button onClick={startMission} disabled={isLoading} size="lg">Begin Mission</Button>
          </div>
        )}

        {phase === 'infiltrating' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Round {round}/{maxRounds}</span>
              <span>🧠 Intel: {intel}%</span>
              <span>⚠️ Suspicion: {suspicion}%</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => doAction('hack')} className="h-20 flex-col"><Target className="w-6 h-6 mb-1" />Hack Systems<span className="text-xs">High intel, risky</span></Button>
              <Button onClick={() => doAction('sneak')} className="h-20 flex-col"><Eye className="w-6 h-6 mb-1" />Sneak Around<span className="text-xs">Safe, moderate intel</span></Button>
              <Button onClick={() => doAction('disguise')} className="h-20 flex-col"><Shield className="w-6 h-6 mb-1" />Use Disguise<span className="text-xs">Steady, low risk</span></Button>
              <Button onClick={() => doAction('bribe')} className="h-20 flex-col">💰 Bribe Guard<span className="text-xs">Big reward or nothing</span></Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">{actions.map((a, i) => <div key={i}>{a}</div>)}</div>
          </div>
        )}

        {phase === 'extracting' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold">Intel gathered: {intel}%</p>
            <p>Suspicion: {suspicion}%</p>
            <p className="text-muted-foreground">{intel >= 80 ? '🔑🔑🔑 3 Keys!' : intel >= 50 ? '🔑🔑 2 Keys!' : intel >= 30 ? '🔑 1 Key!' : 'Not enough intel...'}</p>
            <Button onClick={extract} size="lg">Extract</Button>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{suspicion >= 100 ? '🚨 CAUGHT!' : intel >= 50 ? '✅ Mission Success!' : '⚠️ Partial Intel'}</p>
            <Button onClick={() => setPhase('planning')}>New Mission</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullEspionage;
