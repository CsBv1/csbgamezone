import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function CryptoMerchant() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Crypto Merchant" });
  const [gold, setGold] = useState(100);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [day, setDay] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const GOODS = [
    { id: 'silk', name: '🧵 Silk', basePrice: 20 },
    { id: 'spice', name: '🌶️ Spice', basePrice: 15 },
    { id: 'gems', name: '💎 Gems', basePrice: 50 },
    { id: 'iron', name: '⚒️ Iron', basePrice: 10 },
  ];

  const getPrice = (base: number) => Math.floor(base * (0.5 + Math.random() * 1.5));

  const [prices, setPrices] = useState(() => Object.fromEntries(GOODS.map(g => [g.id, getPrice(g.basePrice)])));

  const buy = (id: string) => {
    if (gold < prices[id]) return;
    setGold(g => g - prices[id]);
    setInventory(inv => ({ ...inv, [id]: (inv[id] || 0) + 1 }));
  };

  const sell = (id: string) => {
    if (!inventory[id] || inventory[id] <= 0) return;
    const sellPrice = prices[id] + bullsOwned * 2;
    setGold(g => g + sellPrice);
    setInventory(inv => ({ ...inv, [id]: inv[id] - 1 }));
  };

  const nextDay = () => {
    if (day >= 15) {
      if (gold >= 500) {
        setGameState('won');
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        awardKeys(keys);
      } else setGameState('lost');
    } else {
      setDay(d => d + 1);
      setPrices(Object.fromEntries(GOODS.map(g => [g.id, getPrice(g.basePrice)])));
    }
  };

  const resetGame = () => { setGold(100); setInventory({}); setDay(1); setGameState('playing'); setKeysEarned(0); setPrices(Object.fromEntries(GOODS.map(g => [g.id, getPrice(g.basePrice)]))); };

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
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🏪 Crypto Merchant</h1>
          <p className="text-muted-foreground">Buy low, sell high! Reach 500g in 15 days!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 2} sell bonus</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '🏪' : '💸'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'Merchant King!' : 'Bankrupt!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💰 Gold: {gold}/500</span>
              <span>📅 Day: {day}/15</span>
            </div>
            <div className="space-y-3 mb-4">
              {GOODS.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span>{g.name} - {prices[g.id]}g</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Own: {inventory[g.id] || 0}</span>
                    <Button size="sm" variant="outline" onClick={() => buy(g.id)} disabled={gold < prices[g.id]}>Buy</Button>
                    <Button size="sm" onClick={() => sell(g.id)} disabled={!inventory[g.id]}>Sell</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={nextDay} className="w-full">Next Day →</Button>
          </>
        )}
      </Card>
    </div>
  );
}
