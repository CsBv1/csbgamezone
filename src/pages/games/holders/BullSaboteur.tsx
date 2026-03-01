import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function BullSaboteur() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Bull Saboteur" });
  const [enemyBase, setEnemyBase] = useState(100);
  const [stealth, setStealth] = useState(100);
  const [tools, setTools] = useState(3 + Math.floor(bullsOwned / 3));
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const actions = [
    { name: '💣 Plant Bomb', damage: 30, stealthCost: 25 },
    { name: '🔧 Sabotage', damage: 15, stealthCost: 10 },
    { name: '🕵️ Sneak', damage: 0, stealthCost: -20 },
    { name: '⚡ EMP Strike', damage: 40, stealthCost: 40 },
  ];

  const doAction = (action: typeof actions[0]) => {
    if (action.stealthCost > 0 && stealth < action.stealthCost) return;
    
    const newStealth = Math.min(100, Math.max(0, stealth - action.stealthCost));
    setStealth(newStealth);
    
    const bonusDamage = bullsOwned * 2;
    setEnemyBase(b => Math.max(0, b - action.damage - bonusDamage));
    
    if (enemyBase - action.damage - bonusDamage <= 0) {
      setGameState('won');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      awardKeys(keys);
    } else if (newStealth <= 0) {
      setGameState('lost');
    } else {
      setRound(r => r + 1);
    }
  };

  const resetGame = () => { setEnemyBase(100); setStealth(100); setTools(3 + Math.floor(bullsOwned / 3)); setRound(1); setGameState('playing'); setKeysEarned(0); };

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
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🕵️ Bull Saboteur</h1>
          <p className="text-muted-foreground">Destroy the enemy base without being detected!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 2} bonus damage</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '💥' : '🚨'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Mission Complete!' : 'Detected!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>🏴 Base HP: {enemyBase}</span>
              <span>🕵️ Stealth: {stealth}%</span>
              <span>📍 Round: {round}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {actions.map(a => (
                <Button key={a.name} variant="outline" onClick={() => doAction(a)} disabled={a.stealthCost > 0 && stealth < a.stealthCost} className="flex flex-col h-auto py-3">
                  <span className="text-sm font-bold">{a.name}</span>
                  <span className="text-xs">{a.damage > 0 ? `${a.damage} dmg` : 'Recover stealth'} | {a.stealthCost > 0 ? `-${a.stealthCost}` : `+${Math.abs(a.stealthCost)}`} stealth</span>
                </Button>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
