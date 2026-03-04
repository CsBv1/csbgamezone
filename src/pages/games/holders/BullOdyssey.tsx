import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, Map, Anchor } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BullOdyssey = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Odyssey" });
  const [phase, setPhase] = useState<'port' | 'sailing' | 'island' | 'result'>('port');
  const [crew, setCrew] = useState(0);
  const [supplies, setSupplies] = useState(0);
  const [treasure, setTreasure] = useState(0);
  const [island, setIsland] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 250;
  const maxIslands = 7;

  const embark = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setCrew(10 + Math.floor(bullsOwned / 2));
    setSupplies(100);
    setTreasure(0);
    setIsland(1);
    setLog([]);
    setPhase('sailing');
  };

  const sail = (route: 'safe' | 'risky' | 'uncharted') => {
    let supplyCost = 0, crewLoss = 0, treasureGain = 0;
    const roll = Math.random();

    switch (route) {
      case 'safe': supplyCost = 10; treasureGain = roll > 0.3 ? 5 + island : 2; break;
      case 'risky': supplyCost = 20; crewLoss = roll > 0.6 ? 0 : 2; treasureGain = roll > 0.4 ? 15 + island * 2 : 0; break;
      case 'uncharted': supplyCost = 30; crewLoss = roll > 0.5 ? 1 : 3; treasureGain = roll > 0.3 ? 25 + island * 3 : 0; break;
    }

    const newSupplies = Math.max(0, supplies - supplyCost);
    const newCrew = Math.max(0, crew - crewLoss);
    setSupplies(newSupplies);
    setCrew(newCrew);
    setTreasure(prev => prev + treasureGain);
    setLog(prev => [...prev, `Island ${island}: ${route} → +${treasureGain}🪙 -${supplyCost}📦 -${crewLoss}👥`]);

    if (newCrew <= 0 || newSupplies <= 0) {
      finishVoyage(treasure + treasureGain);
    } else if (island >= maxIslands) {
      finishVoyage(treasure + treasureGain);
    } else {
      setIsland(prev => prev + 1);
      setPhase('island');
    }
  };

  const resupply = () => {
    const cost = Math.floor(treasure / 3);
    if (cost > 0) {
      setTreasure(prev => prev - cost);
      setSupplies(prev => Math.min(100, prev + 30));
      setCrew(prev => prev + 2);
    }
    setPhase('sailing');
  };

  const finishVoyage = async (finalTreasure: number) => {
    const keys = finalTreasure >= 100 ? 5 : finalTreasure >= 60 ? 3 : finalTreasure >= 30 ? 2 : finalTreasure > 0 ? 1 : 0;
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">⛵ Bull Odyssey</h1>
          <p className="text-muted-foreground">Sail across 7 islands, gather treasure, manage your crew!</p>
        </div>

        {phase === 'port' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Sail to {maxIslands} islands</p>
            <p className="text-sm text-muted-foreground">Bull bonus: +{Math.floor(bullsOwned / 2)} starting crew</p>
            <Button onClick={embark} disabled={isLoading} size="lg">⛵ Set Sail</Button>
          </div>
        )}

        {phase === 'sailing' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>🏝️ Island {island}/{maxIslands}</span>
              <span>👥 Crew: {crew}</span>
              <span>📦 Supplies: {supplies}</span>
              <span>🪙 Treasure: {treasure}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => sail('safe')} className="h-20 flex-col"><Compass className="w-5 h-5 mb-1" />Safe Route<span className="text-xs">Low risk, low reward</span></Button>
              <Button onClick={() => sail('risky')} className="h-20 flex-col"><Map className="w-5 h-5 mb-1" />Risky Route<span className="text-xs">Medium risk/reward</span></Button>
              <Button onClick={() => sail('uncharted')} className="h-20 flex-col"><Anchor className="w-5 h-5 mb-1" />Uncharted<span className="text-xs">High risk, high reward</span></Button>
            </div>
            <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto space-y-1">{log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}</div>
          </div>
        )}

        {phase === 'island' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold">🏝️ Island {island} Port</p>
            <p>Crew: {crew} • Supplies: {supplies} • Treasure: {treasure}</p>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={resupply} disabled={treasure < 3}>🔧 Resupply (costs {Math.floor(treasure / 3)}🪙)</Button>
              <Button onClick={() => setPhase('sailing')}>⛵ Continue Sailing</Button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{treasure >= 60 ? '🏆 Grand Voyage!' : crew <= 0 ? '💀 Lost at Sea!' : `⛵ Treasure: ${treasure}`}</p>
            <p className="text-muted-foreground">{treasure >= 100 ? '🔑×5' : treasure >= 60 ? '🔑×3' : treasure >= 30 ? '🔑×2' : treasure > 0 ? '🔑×1' : 'No keys'}</p>
            <Button onClick={() => setPhase('port')}>New Voyage</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullOdyssey;
