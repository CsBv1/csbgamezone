import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Beaker } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function BullAlchemist() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Bull Alchemist" });
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [gold, setGold] = useState(0);
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const ELEMENTS = ['🔥 Fire', '💧 Water', '🌍 Earth', '💨 Air', '⚡ Lightning', '❄️ Ice'];
  const RECIPES: Record<string, { result: string; value: number }> = {
    '🔥 Fire+💧 Water': { result: '☁️ Steam', value: 20 },
    '🌍 Earth+🔥 Fire': { result: '🌋 Lava', value: 30 },
    '💨 Air+⚡ Lightning': { result: '🌩️ Storm', value: 40 },
    '💧 Water+❄️ Ice': { result: '🧊 Crystal', value: 50 },
    '🔥 Fire+⚡ Lightning': { result: '☀️ Plasma', value: 60 },
    '🌍 Earth+💧 Water': { result: '🌿 Life', value: 35 },
  };

  const addIngredient = (element: string) => {
    if (ingredients.length >= 2) return;
    setIngredients(prev => [...prev, element]);
  };

  const brew = () => {
    if (ingredients.length < 2) return;
    const key1 = `${ingredients[0]}+${ingredients[1]}`;
    const key2 = `${ingredients[1]}+${ingredients[0]}`;
    const recipe = RECIPES[key1] || RECIPES[key2];
    
    if (recipe) {
      setGold(g => g + recipe.value + bullsOwned * 5);
      if (gold + recipe.value >= 200) {
        setGameState('won');
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        awardKeys(keys);
      } else {
        setRound(r => r + 1);
      }
    } else {
      setGold(g => Math.max(0, g - 10));
      if (round >= 10 && gold < 200) setGameState('lost');
      else setRound(r => r + 1);
    }
    setIngredients([]);
  };

  const resetGame = () => { setIngredients([]); setGold(0); setRound(1); setGameState('playing'); setKeysEarned(0); };

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
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">⚗️ Bull Alchemist</h1>
          <p className="text-muted-foreground">Combine elements to create gold! Reach 200g to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 5} bonus per brew</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '⚗️' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Master Alchemist!' : 'Experiment Failed!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💰 Gold: {gold}/200</span>
              <span>🧪 Round: {round}/10</span>
            </div>
            <div className="mb-4 p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm mb-2">Brewing: {ingredients.length === 0 ? 'Select 2 elements' : ingredients.join(' + ')}</p>
              {ingredients.length === 2 && <Button onClick={brew}>🧪 Brew!</Button>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ELEMENTS.map(el => (
                <Button key={el} variant="outline" onClick={() => addIngredient(el)} disabled={ingredients.length >= 2}>{el}</Button>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
