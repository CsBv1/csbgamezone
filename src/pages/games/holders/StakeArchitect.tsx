import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function StakeArchitect() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Stake Architect" });
  const [buildings, setBuildings] = useState({ houses: 0, markets: 0, temples: 0 });
  const [resources, setResources] = useState(200);
  const [turn, setTurn] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const COSTS = { houses: 30, markets: 80, temples: 200 };
  const INCOME = { houses: 10, markets: 30, temples: 100 };

  const build = (type: keyof typeof COSTS) => {
    if (resources < COSTS[type]) return;
    setResources(r => r - COSTS[type]);
    setBuildings(b => ({ ...b, [type]: b[type] + 1 }));
  };

  const endTurn = () => {
    const income = buildings.houses * INCOME.houses + buildings.markets * INCOME.markets + buildings.temples * INCOME.temples + bullsOwned * 5;
    setResources(r => r + income);
    
    const totalBuildings = buildings.houses + buildings.markets * 3 + buildings.temples * 10;
    if (totalBuildings >= 30) {
      setGameState('won');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      awardKeys(keys);
    } else if (turn >= 20) {
      setGameState('lost');
    } else {
      setTurn(t => t + 1);
    }
  };

  const resetGame = () => { setBuildings({ houses: 0, markets: 0, temples: 0 }); setResources(200); setTurn(1); setGameState('playing'); setKeysEarned(0); };

  if (isLoading) return <div className="min-h-screen bull-pattern flex items-center justify-center"><div className="text-2xl text-primary animate-pulse">Loading...</div></div>;
  if (!isAuthorized) return null;

  const score = buildings.houses + buildings.markets * 3 + buildings.temples * 10;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
        <CreditBar />
      </div>
      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🏛️ Stake Architect</h1>
          <p className="text-muted-foreground">Build a city score of 30 in 20 turns!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 5} income/turn</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '🏛️' : '🏚️'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Master Architect!' : 'City Collapsed!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>🪨 Resources: {resources}</span>
              <span>📊 Score: {score}/30</span>
              <span>📅 Turn: {turn}/20</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button variant="outline" onClick={() => build('houses')} disabled={resources < COSTS.houses} className="flex flex-col h-auto py-3">
                <span className="text-xl">🏠</span><span className="text-xs">House ({COSTS.houses})</span><span className="text-xs">Own: {buildings.houses}</span>
              </Button>
              <Button variant="outline" onClick={() => build('markets')} disabled={resources < COSTS.markets} className="flex flex-col h-auto py-3">
                <span className="text-xl">🏪</span><span className="text-xs">Market ({COSTS.markets})</span><span className="text-xs">Own: {buildings.markets}</span>
              </Button>
              <Button variant="outline" onClick={() => build('temples')} disabled={resources < COSTS.temples} className="flex flex-col h-auto py-3">
                <span className="text-xl">🏛️</span><span className="text-xs">Temple ({COSTS.temples})</span><span className="text-xs">Own: {buildings.temples}</span>
              </Button>
            </div>
            <Button onClick={endTurn} className="w-full">End Turn →</Button>
          </>
        )}
      </Card>
    </div>
  );
}
