import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function CardanoRaider() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Cardano Raider" });
  const [loot, setLoot] = useState(0);
  const [hp, setHp] = useState(100);
  const [room, setRoom] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const rooms = ['🗝️ Treasure Room', '🐉 Dragon Lair', '🧙 Wizard Tower', '⚔️ Guard Post', '💰 Vault'];

  const explore = () => {
    const danger = Math.random();
    const bullBonus = bullsOwned * 3;
    
    if (danger < 0.3) {
      const treasure = 20 + Math.floor(Math.random() * 30) + bullBonus;
      setLoot(l => l + treasure);
    } else if (danger < 0.6) {
      const damage = 15 + Math.floor(Math.random() * 15);
      setHp(h => Math.max(0, h - damage));
      setLoot(l => l + 10 + bullBonus);
      if (hp - damage <= 0) { setGameState('lost'); return; }
    } else {
      const bigLoot = 40 + Math.floor(Math.random() * 40) + bullBonus;
      const bigDamage = 20 + Math.floor(Math.random() * 20);
      setLoot(l => l + bigLoot);
      setHp(h => Math.max(0, h - bigDamage));
      if (hp - bigDamage <= 0) { setGameState('lost'); return; }
    }

    if (room >= 10) {
      setGameState('won');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      awardKeys(keys);
    } else setRoom(r => r + 1);
  };

  const rest = () => { setHp(h => Math.min(100, h + 20)); setRoom(r => r + 1); if (room >= 10) setGameState(loot >= 100 ? 'won' : 'lost'); };
  const resetGame = () => { setLoot(0); setHp(100); setRoom(1); setGameState('playing'); setKeysEarned(0); };

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
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🏴‍☠️ Cardano Raider</h1>
          <p className="text-muted-foreground">Raid 10 rooms and survive!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 3} loot bonus</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '🏴‍☠️' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Raid Complete!' : 'Fallen in Battle!'}</h2>
            <p className="text-muted-foreground mb-2">Total Loot: {loot}</p>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💰 Loot: {loot}</span>
              <span>❤️ HP: {hp}</span>
              <span>🚪 Room: {room}/10</span>
            </div>
            <p className="text-center mb-4 text-lg">{rooms[room % rooms.length]}</p>
            <div className="flex gap-2">
              <Button onClick={explore} className="flex-1">⚔️ Explore & Fight</Button>
              <Button onClick={rest} variant="outline" className="flex-1">🛏️ Rest (+20 HP)</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
