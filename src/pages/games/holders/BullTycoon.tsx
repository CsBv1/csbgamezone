import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Coins, TrendingUp, Users, Zap } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

audioManager.startBackgroundMusic();

interface Business {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  income: number;
  owned: number;
  multiplier: number;
}

const INITIAL_BUSINESSES: Business[] = [
  { id: 'farm', name: 'Bull Farm', emoji: '🐂', cost: 50, income: 5, owned: 0, multiplier: 1 },
  { id: 'ranch', name: 'ADA Ranch', emoji: '🏠', cost: 200, income: 25, owned: 0, multiplier: 1 },
  { id: 'stable', name: 'Golden Stable', emoji: '🏛️', cost: 1000, income: 150, owned: 0, multiplier: 1 },
  { id: 'arena', name: 'Bull Arena', emoji: '🏟️', cost: 5000, income: 800, owned: 0, multiplier: 1 },
  { id: 'empire', name: 'Crypto Empire', emoji: '🏰', cost: 25000, income: 5000, owned: 0, multiplier: 1 },
];

const TARGET_GOLD = 100000;

export default function BullTycoon() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Tycoon" 
  });
  
  const [gold, setGold] = useState(100);
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [day, setDay] = useState(1);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Income tick every 2 seconds
  useEffect(() => {
    if (gameOver) return;
    
    const interval = setInterval(() => {
      const income = businesses.reduce((sum, b) => sum + (b.income * b.owned * b.multiplier), 0);
      if (income > 0) {
        audioManager.playSFX('coin');
        setGold(g => {
          const newGold = g + income;
          if (newGold >= TARGET_GOLD) {
            setWon(true);
            setGameOver(true);
          }
          return newGold;
        });
        setTotalEarnings(t => t + income);
      }
      setDay(d => d + 1);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [businesses, gameOver]);

  // Award keys on win
  useEffect(() => {
    const doAward = async () => {
      if (gameOver && won) {
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        await awardKeys(keys);
        audioManager.playSFX('jackpot');
      }
    };
    doAward();
  }, [gameOver, won]);

  const buyBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business || gold < business.cost) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('collect');
    setGold(g => g - business.cost);
    setBusinesses(businesses.map(b => 
      b.id === businessId 
        ? { ...b, owned: b.owned + 1, cost: Math.floor(b.cost * 1.3) }
        : b
    ));
  };

  const upgradeBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business || business.owned === 0) return;
    
    const upgradeCost = business.cost * 2;
    if (gold < upgradeCost) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('levelUp');
    setGold(g => g - upgradeCost);
    setBusinesses(businesses.map(b => 
      b.id === businessId 
        ? { ...b, multiplier: b.multiplier + 0.5 }
        : b
    ));
  };

  const resetGame = () => {
    setGold(100);
    setBusinesses(INITIAL_BUSINESSES);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
    setDay(1);
    setTotalEarnings(0);
  };

  const totalIncome = businesses.reduce((sum, b) => sum + (b.income * b.owned * b.multiplier), 0);

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

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Building className="w-8 h-8 text-amber-500" />
            Bull Tycoon
          </h1>
          <p className="text-muted-foreground">Build your empire! Reach {TARGET_GOLD.toLocaleString()}g to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{won ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Tycoon Victory!' : 'Bankrupt!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">Day {day} - Total Earnings: {totalEarnings.toLocaleString()}g</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Build Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Coins className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                <p className="text-xs text-muted-foreground">Gold</p>
                <p className="font-bold text-yellow-400">{gold.toLocaleString()}g</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <TrendingUp className="w-5 h-5 mx-auto text-green-400 mb-1" />
                <p className="text-xs text-muted-foreground">Income/tick</p>
                <p className="font-bold text-green-400">+{totalIncome.toLocaleString()}g</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Users className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                <p className="text-xs text-muted-foreground">Day</p>
                <p className="font-bold text-blue-400">{day}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress to {TARGET_GOLD.toLocaleString()}g</span>
                <span>{Math.min(100, Math.floor((gold / TARGET_GOLD) * 100))}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (gold / TARGET_GOLD) * 100)}%` }}
                />
              </div>
            </div>

            {/* Businesses */}
            <div className="space-y-3">
              {businesses.map(business => (
                <div key={business.id} className="p-4 bg-muted/20 rounded-lg flex items-center gap-4">
                  <div className="text-3xl">{business.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{business.name}</h3>
                      {business.multiplier > 1 && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          x{business.multiplier.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Owned: {business.owned} | Income: +{(business.income * business.owned * business.multiplier).toLocaleString()}g
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => buyBusiness(business.id)}
                      disabled={gold < business.cost}
                    >
                      Buy ({business.cost.toLocaleString()}g)
                    </Button>
                    {business.owned > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => upgradeBusiness(business.id)}
                        disabled={gold < business.cost * 2}
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
