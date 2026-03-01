import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function BullWarlord() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Bull Warlord" });
  const [army, setArmy] = useState(10 + bullsOwned);
  const [territory, setTerritory] = useState(1);
  const [gold, setGold] = useState(50);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const attack = () => {
    const enemyStrength = territory * 5 + Math.floor(Math.random() * 10);
    if (army > enemyStrength) {
      setArmy(a => a - Math.floor(enemyStrength / 2));
      setTerritory(t => t + 1);
      setGold(g => g + territory * 20);
      if (territory >= 7) {
        setGameState('won');
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        awardKeys(keys);
      }
    } else {
      setArmy(a => Math.max(0, a - Math.floor(army * 0.5)));
      if (army <= 3) setGameState('lost');
    }
  };

  const recruit = () => {
    if (gold >= 30) { setGold(g => g - 30); setArmy(a => a + 5); }
  };

  const resetGame = () => { setArmy(10 + bullsOwned); setTerritory(1); setGold(50); setGameState('playing'); setKeysEarned(0); };

  if (isLoading) return <div className="min-h-screen bull-pattern flex items-center justify-center"><div className="text-2xl text-primary animate-pulse">Loading...</div></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
        <CreditBar />
      </div>
      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">⚔️ Bull Warlord</h1>
          <p className="text-muted-foreground">Conquer 7 territories to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned} starting army</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '👑' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Supreme Warlord!' : 'Defeated!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>⚔️ Army: {army}</span>
              <span>🏴 Territory: {territory}/7</span>
              <span>💰 Gold: {gold}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={attack} className="flex-1">⚔️ Attack Territory {territory + 1}</Button>
              <Button onClick={recruit} variant="outline" className="flex-1" disabled={gold < 30}>🛡️ Recruit (30g)</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
