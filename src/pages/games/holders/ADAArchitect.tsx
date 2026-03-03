import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUILDINGS = [
  { name: 'Farm', cost: 50, income: 5, emoji: '🌾' },
  { name: 'Mine', cost: 120, income: 12, emoji: '⛏️' },
  { name: 'Market', cost: 200, income: 20, emoji: '🏪' },
  { name: 'Bank', cost: 500, income: 50, emoji: '🏦' },
  { name: 'Temple', cost: 1000, income: 100, emoji: '🛕' },
];

const ADAArchitect = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "ADA Architect" });
  const [gold, setGold] = useState(300);
  const [buildings, setBuildings] = useState<Record<string, number>>({});
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const maxTurns = 12;
  const entryCost = 150;
  const [started, setStarted] = useState(false);

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setStarted(true);
    setGold(300 + bullsOwned * 10);
    setBuildings({});
    setTurn(1);
    setPhase('playing');
  };

  const buy = (name: string, cost: number) => {
    if (gold < cost) return;
    setGold(prev => prev - cost);
    setBuildings(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  const endTurn = async () => {
    const income = BUILDINGS.reduce((sum, b) => sum + (buildings[b.name] || 0) * b.income, 0);
    const newGold = gold + income;
    setGold(newGold);

    if (turn >= maxTurns) {
      const totalValue = BUILDINGS.reduce((sum, b) => sum + (buildings[b.name] || 0) * b.cost, 0) + newGold;
      const keys = totalValue >= 5000 ? 4 : totalValue >= 3000 ? 3 : totalValue >= 1500 ? 2 : totalValue >= 500 ? 1 : 0;
      if (keys > 0) await awardKeys(keys);
      setPhase('done');
    } else {
      setTurn(prev => prev + 1);
    }
  };

  const totalValue = BUILDINGS.reduce((sum, b) => sum + (buildings[b.name] || 0) * b.cost, 0) + gold;
  const income = BUILDINGS.reduce((sum, b) => sum + (buildings[b.name] || 0) * b.income, 0);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🏗️ ADA Architect</h1>
          <p className="text-muted-foreground">Build the most valuable city in {maxTurns} turns!</p>
        </div>

        {!started ? (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Build buildings to grow your city value</p>
            <Button onClick={start} disabled={isLoading} size="lg">Start Building</Button>
          </div>
        ) : phase === 'playing' ? (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold flex-wrap gap-2">
              <span>Turn {turn}/{maxTurns}</span>
              <span>🪙 Gold: {gold}</span>
              <span>📈 Income: +{income}/turn</span>
              <span>💰 Value: {totalValue}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {BUILDINGS.map(b => (
                <Button key={b.name} onClick={() => buy(b.name, b.cost)} disabled={gold < b.cost} className="h-auto py-3 flex-col">
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-xs font-bold">{b.name}</span>
                  <span className="text-xs">Cost: {b.cost} • +{b.income}/turn</span>
                  <span className="text-xs text-muted-foreground">Owned: {buildings[b.name] || 0}</span>
                </Button>
              ))}
            </div>

            <Button onClick={endTurn} className="w-full" size="lg">End Turn → Collect Income</Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">🏙️ City Value: {totalValue}</p>
            <p className="text-xl">{totalValue >= 5000 ? '🔑🔑🔑🔑 4 Keys!' : totalValue >= 3000 ? '🔑🔑🔑 3 Keys!' : totalValue >= 1500 ? '🔑🔑 2 Keys!' : totalValue >= 500 ? '🔑 1 Key!' : 'Not enough value...'}</p>
            <Button onClick={() => setStarted(false)}>Play Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ADAArchitect;
