import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately when game loads
audioManager.startBackgroundMusic();

interface Asset {
  name: string;
  emoji: string;
  price: number;
  history: number[];
  trend: number;
}

export default function MarketMaster() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Market Master" 
  });
  
  const [cash, setCash] = useState(1000);
  const [day, setDay] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([
    { name: 'ADA', emoji: '🔷', price: 100, history: [100], trend: 0 },
    { name: 'BULL', emoji: '🐂', price: 50, history: [50], trend: 0 },
    { name: 'GEM', emoji: '💎', price: 200, history: [200], trend: 0 },
  ]);
  const [holdings, setHoldings] = useState<{ [key: string]: number }>({});
  const [gameOver, setGameOver] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);

  const DAYS_TO_WIN = 20;
  const TARGET_PROFIT = 2000; // Need to reach 3000 total (1000 start + 2000 profit)

  const buy = (assetName: string) => {
    const asset = assets.find(a => a.name === assetName);
    if (!asset || cash < asset.price) return;
    
    audioManager.playSFX('trade');
    setCash(c => c - asset.price);
    setHoldings(h => ({ ...h, [assetName]: (h[assetName] || 0) + 1 }));
  };

  const sell = (assetName: string) => {
    if (!holdings[assetName]) return;
    const asset = assets.find(a => a.name === assetName);
    if (!asset) return;
    
    audioManager.playSFX('coin');
    setCash(c => c + asset.price);
    setHoldings(h => ({ ...h, [assetName]: h[assetName] - 1 }));
  };

  const nextDay = () => {
    if (day >= DAYS_TO_WIN) {
      endGame();
      return;
    }

    setAssets(prev => prev.map(asset => {
      // Random walk with trend
      const volatility = 0.15;
      const change = (Math.random() - 0.5) * 2 * volatility + asset.trend * 0.05;
      const newPrice = Math.max(10, Math.round(asset.price * (1 + change)));
      const newTrend = change > 0 ? Math.min(1, asset.trend + 0.1) : Math.max(-1, asset.trend - 0.1);
      
      return {
        ...asset,
        price: newPrice,
        history: [...asset.history.slice(-9), newPrice],
        trend: newTrend,
      };
    }));
    
    setDay(d => d + 1);
  };

  const getPortfolioValue = () => {
    let value = cash;
    Object.entries(holdings).forEach(([name, qty]) => {
      const asset = assets.find(a => a.name === name);
      if (asset) value += asset.price * qty;
    });
    return value;
  };

  const endGame = async () => {
    setGameOver(true);
    const portfolio = getPortfolioValue();
    if (portfolio >= 1000 + TARGET_PROFIT) {
      audioManager.playSFX('jackpot');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    } else {
      audioManager.playSFX('lose');
    }
  };

  const resetGame = () => {
    setCash(1000);
    setDay(1);
    setAssets([
      { name: 'ADA', emoji: '🔷', price: 100, history: [100], trend: 0 },
      { name: 'BULL', emoji: '🐂', price: 50, history: [50], trend: 0 },
      { name: 'GEM', emoji: '💎', price: 200, history: [200], trend: 0 },
    ]);
    setHoldings({});
    setGameOver(false);
    setKeysEarned(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const portfolioValue = getPortfolioValue();
  const profit = portfolioValue - 1000;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <DollarSign className="w-8 h-8 text-amber-500" />
            Market Master
          </h1>
          <p className="text-muted-foreground">Trade your way to {TARGET_PROFIT}+ profit in {DAYS_TO_WIN} days!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys on win</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{profit >= TARGET_PROFIT ? '📈' : '📉'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {profit >= TARGET_PROFIT ? 'Trading Success!' : 'Market Closed'}
            </h2>
            <p className="text-lg mb-2">Final Portfolio: ${portfolioValue}</p>
            <p className={`text-lg mb-4 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}{profit} profit
            </p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Trade Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💵 Cash: ${cash}</span>
              <span>📅 Day: {day}/{DAYS_TO_WIN}</span>
              <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                P/L: {profit >= 0 ? '+' : ''}{profit}
              </span>
            </div>

            <div className="space-y-4 mb-4">
              {assets.map(asset => (
                <div key={asset.name} className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{asset.emoji}</span>
                      <span className="font-bold">{asset.name}</span>
                      {asset.trend > 0.3 && <TrendingUp className="w-4 h-4 text-green-400" />}
                      {asset.trend < -0.3 && <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <span className="font-mono text-lg">${asset.price}</span>
                  </div>
                  
                  {/* Mini chart */}
                  <div className="h-8 flex items-end gap-0.5 mb-2">
                    {asset.history.map((p, i) => {
                      const max = Math.max(...asset.history);
                      const min = Math.min(...asset.history);
                      const height = max === min ? 50 : ((p - min) / (max - min)) * 100;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t ${p >= (asset.history[i - 1] || p) ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ height: `${Math.max(10, height)}%` }}
                        />
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Holding: {holdings[asset.name] || 0}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => buy(asset.name)}
                        disabled={cash < asset.price}
                      >
                        Buy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => sell(asset.name)}
                        disabled={!holdings[asset.name]}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={nextDay} className="w-full" size="lg">
              Next Day →
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
