import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Asset {
  name: string;
  icon: string;
  price: number;
  owned: number;
  trend: number; // -1, 0, 1
}

const CryptoTrader = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Crypto Trader" });
  const [gold, setGold] = useState(1000);
  const [turn, setTurn] = useState(1);
  const maxTurns = 15;
  const [assets, setAssets] = useState<Asset[]>([
    { name: "ADA Coin", icon: "₳", price: 50, owned: 0, trend: 0 },
    { name: "Bull Token", icon: "🐂", price: 120, owned: 0, trend: 0 },
    { name: "Diamond Shard", icon: "💎", price: 200, owned: 0, trend: 0 },
    { name: "Rune Crystal", icon: "🔮", price: 80, owned: 0, trend: 0 },
    { name: "Gold Bar", icon: "🪙", price: 300, owned: 0, trend: 0 },
  ]);
  const [log, setLog] = useState<string[]>(["📊 The market is open! Buy low, sell high."]);
  const [gameOver, setGameOver] = useState(false);

  const buy = (index: number) => {
    const a = assets[index];
    if (gold < a.price || gameOver) return;
    setGold(prev => prev - a.price);
    setAssets(prev => prev.map((aa, i) => i === index ? { ...aa, owned: aa.owned + 1 } : aa));
    setLog(prev => [`📈 Bought 1 ${a.icon} ${a.name} for ${a.price}`, ...prev.slice(0, 8)]);
  };

  const sell = (index: number) => {
    const a = assets[index];
    if (a.owned <= 0 || gameOver) return;
    setGold(prev => prev + a.price);
    setAssets(prev => prev.map((aa, i) => i === index ? { ...aa, owned: aa.owned - 1 } : aa));
    setLog(prev => [`📉 Sold 1 ${a.icon} ${a.name} for ${a.price}`, ...prev.slice(0, 8)]);
  };

  const nextTurn = useCallback(() => {
    if (gameOver) return;
    setAssets(prev => prev.map(a => {
      const change = Math.floor(Math.random() * 60) - 25;
      const newPrice = Math.max(10, a.price + change);
      return { ...a, price: newPrice, trend: change > 0 ? 1 : change < 0 ? -1 : 0 };
    }));
    setTurn(prev => prev + 1);
    setLog(prev => [`📅 Turn ${turn + 1}: Market shifted!`, ...prev.slice(0, 8)]);

    if (turn + 1 > maxTurns) {
      setGameOver(true);
      // Calculate total portfolio value
      const portfolioValue = gold + assets.reduce((s, a) => s + a.price * a.owned, 0);
      setLog(prev => [`🏆 Final portfolio: ${portfolioValue} gold`, ...prev.slice(0, 8)]);
      if (portfolioValue >= 1500) awardKeys(Math.ceil((portfolioValue - 1000) / 500));
    }
  }, [turn, gold, assets, gameOver, awardKeys]);

  const portfolioValue = gold + assets.reduce((s, a) => s + a.price * a.owned, 0);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-foreground">Loading...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">📊 Crypto Trader</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gold</p><p className="text-lg font-bold">🪙 {gold}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Portfolio</p><p className="text-lg font-bold">💰 {portfolioValue}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Turn</p><p className="text-lg font-bold">{turn}/{maxTurns}</p></Card>
        </div>

        <div className="space-y-2">
          {assets.map((a, i) => (
            <Card key={a.name} className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">
                  {a.icon} {a.name} 
                  <span className={`ml-2 text-xs ${a.trend > 0 ? 'text-green-400' : a.trend < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {a.trend > 0 ? '📈' : a.trend < 0 ? '📉' : '—'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">Price: {a.price}🪙 | Owned: {a.owned}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => buy(i)} disabled={gold < a.price || gameOver}>Buy</Button>
                <Button size="sm" variant="outline" onClick={() => sell(i)} disabled={a.owned <= 0 || gameOver}>Sell</Button>
              </div>
            </Card>
          ))}
        </div>

        <Button className="w-full" onClick={nextTurn} disabled={gameOver}>
          ⏭️ Next Turn ({turn}/{maxTurns})
        </Button>

        {gameOver && (
          <Card className="p-4 border-primary/50 bg-primary/10 text-center">
            <p className="text-lg font-bold text-foreground">📊 Market Closed!</p>
            <p className="text-muted-foreground">Final portfolio: {portfolioValue} gold (Started: 1000)</p>
            <p className="text-sm text-primary">{portfolioValue >= 1500 ? '🏆 Profitable!' : '📉 Try again!'}</p>
            <Button className="mt-2" onClick={() => window.location.reload()}>Play Again</Button>
          </Card>
        )}

        <Card className="p-3">
          <p className="text-xs font-bold text-foreground mb-1">Trade Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {log.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CryptoTrader;
