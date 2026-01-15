import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

interface Asset {
  id: string;
  name: string;
  emoji: string;
  price: number;
  basePrice: number;
  volatility: number;
  trend: 'up' | 'down' | 'stable';
}

export default function BullTrader() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Trader" 
  });
  
  const [gold, setGold] = useState(500);
  const [day, setDay] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [portfolio, setPortfolio] = useState<{ [key: string]: number }>({});
  
  const maxDays = 20;
  const goalGold = 1500;

  const [assets, setAssets] = useState<Asset[]>([
    { id: "ada", name: "ADA Coin", emoji: "🔵", price: 50, basePrice: 50, volatility: 0.3, trend: 'stable' },
    { id: "bull", name: "Bull Token", emoji: "🐂", price: 80, basePrice: 80, volatility: 0.4, trend: 'up' },
    { id: "gem", name: "Gem Shard", emoji: "💎", price: 120, basePrice: 120, volatility: 0.25, trend: 'stable' },
    { id: "gold", name: "Gold Bar", emoji: "🪙", price: 200, basePrice: 200, volatility: 0.2, trend: 'down' },
  ]);

  const updatePrices = () => {
    setAssets(prevAssets => prevAssets.map(asset => {
      const trendMod = asset.trend === 'up' ? 0.1 : asset.trend === 'down' ? -0.1 : 0;
      const change = (Math.random() - 0.5 + trendMod) * asset.volatility;
      const newPrice = Math.max(10, Math.round(asset.price * (1 + change)));
      
      // Occasionally change trend
      let newTrend = asset.trend;
      if (Math.random() < 0.2) {
        const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
        newTrend = trends[Math.floor(Math.random() * 3)];
      }
      
      return { ...asset, price: newPrice, trend: newTrend };
    }));
  };

  const buy = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || gold < asset.price) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('coin');
    setGold(g => g - asset.price);
    setPortfolio(p => ({ ...p, [assetId]: (p[assetId] || 0) + 1 }));
  };

  const sell = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !portfolio[assetId] || portfolio[assetId] <= 0) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('collect');
    setGold(g => g + asset.price);
    setPortfolio(p => ({ ...p, [assetId]: p[assetId] - 1 }));
  };

  const nextDay = () => {
    audioManager.playSFX('buttonPress');
    updatePrices();
    const newDay = day + 1;
    setDay(newDay);
    
    if (newDay > maxDays) {
      endGame();
    }
  };

  const endGame = async () => {
    setGameOver(true);
    
    // Calculate total value
    let totalValue = gold;
    assets.forEach(asset => {
      totalValue += (portfolio[asset.id] || 0) * asset.price;
    });
    
    if (totalValue >= goalGold) {
      audioManager.playSFX('jackpot');
      const keys = 1 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    } else {
      audioManager.playSFX('lose');
    }
  };

  const resetGame = () => {
    setGold(500);
    setDay(1);
    setGameOver(false);
    setKeysEarned(0);
    setPortfolio({});
    setAssets([
      { id: "ada", name: "ADA Coin", emoji: "🔵", price: 50, basePrice: 50, volatility: 0.3, trend: 'stable' },
      { id: "bull", name: "Bull Token", emoji: "🐂", price: 80, basePrice: 80, volatility: 0.4, trend: 'up' },
      { id: "gem", name: "Gem Shard", emoji: "💎", price: 120, basePrice: 120, volatility: 0.25, trend: 'stable' },
      { id: "gold", name: "Gold Bar", emoji: "🪙", price: 200, basePrice: 200, volatility: 0.2, trend: 'down' },
    ]);
  };

  const totalValue = gold + assets.reduce((sum, asset) => sum + (portfolio[asset.id] || 0) * asset.price, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-lg mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-green-500" />
            Bull Trader
          </h1>
          <p className="text-muted-foreground">Trade assets! Reach {goalGold}g in {maxDays} days.</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{totalValue >= goalGold ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {totalValue >= goalGold ? 'Trading Master!' : 'Market Crash!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">Final Value: {totalValue}g / {goalGold}g</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Trade Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex justify-between items-center mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cash</p>
                <p className="text-xl font-bold text-yellow-400">{gold}g</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Day</p>
                <p className="text-xl font-bold">{day}/{maxDays}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-green-400">{totalValue}g</p>
              </div>
            </div>

            {/* Market */}
            <div className="space-y-2 mb-4">
              {assets.map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{asset.emoji}</span>
                    <div>
                      <p className="font-semibold">{asset.name}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-yellow-400">{asset.price}g</span>
                        {asset.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
                        {asset.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
                        <span className="text-muted-foreground">Own: {portfolio[asset.id] || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => buy(asset.id)} disabled={gold < asset.price}>
                      Buy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sell(asset.id)} disabled={!portfolio[asset.id]}>
                      Sell
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={nextDay} className="w-full" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Next Day ({maxDays - day} remaining)
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
