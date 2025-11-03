import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Castle, Wheat, Users, Gem, TrendingUp } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const BullKingdom = () => {
  const navigate = useNavigate();
  const { credits, diamonds, awardDiamonds, awardCredits, loading } = useGameLogic("Bull Kingdom");
  
  const [kingdom, setKingdom] = useState({
    bulls: 5,
    farms: 1,
    mines: 0,
    castles: 0
  });
  
  const [resources, setResources] = useState({
    food: 100,
    gems: 0
  });

  const [autoCollect, setAutoCollect] = useState(false);

  const prices = {
    bull: 50,
    farm: 200,
    mine: 500,
    castle: 1000
  };

  const production = {
    foodPerFarm: 10,
    gemsPerMine: 5,
    bonusPerCastle: 1.2
  };

  useEffect(() => {
    if (!autoCollect) return;

    const interval = setInterval(() => {
      const foodProduced = kingdom.farms * production.foodPerFarm;
      const gemsProduced = kingdom.mines * production.gemsPerMine;
      const castleBonus = Math.pow(production.bonusPerCastle, kingdom.castles);
      
      setResources(prev => ({
        food: prev.food + Math.floor(foodProduced * castleBonus),
        gems: prev.gems + Math.floor(gemsProduced * castleBonus)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [autoCollect, kingdom]);

  const buyBuilding = (type: string) => {
    const cost = prices[type as keyof typeof prices];
    const buildingKey = type === 'bull' ? 'bulls' : type === 'farm' ? 'farms' : type === 'mine' ? 'mines' : 'castles';
    const currentCount = kingdom[buildingKey as keyof typeof kingdom];
    
    if (credits >= cost && currentCount < 100) {
      setKingdom(prev => ({
        ...prev,
        [buildingKey]: currentCount + 1
      }));
    }
  };

  const collectRewards = async () => {
    if (resources.food > 0) {
      const creditsEarned = Math.floor(resources.food / 10);
      await awardCredits(creditsEarned);
    }
    
    if (resources.gems > 0) {
      await awardDiamonds(resources.gems);
    }
    
    setResources({ food: 0, gems: 0 });
  };

  const totalPower = kingdom.bulls + kingdom.farms * 2 + kingdom.mines * 5 + kingdom.castles * 10;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-6xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🏰 Bull Kingdom
          </h1>
          <p className="text-muted-foreground">Build your bull empire and earn passive rewards!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-2xl font-bold text-primary">💰 {credits}</div>
            <div className="text-2xl font-bold text-accent">💎 {diamonds}</div>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Kingdom Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 bg-primary/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Castle className="w-5 h-5" />
              Kingdom Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>🐂 Bulls:</span>
                <span className="font-bold">{kingdom.bulls}</span>
              </div>
              <div className="flex justify-between">
                <span>🌾 Farms:</span>
                <span className="font-bold">{kingdom.farms}</span>
              </div>
              <div className="flex justify-between">
                <span>⛏️ Mines:</span>
                <span className="font-bold">{kingdom.mines}</span>
              </div>
              <div className="flex justify-between">
                <span>🏰 Castles:</span>
                <span className="font-bold">{kingdom.castles}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Total Power:
                </span>
                <span className="font-bold text-primary">{totalPower}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-accent/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Wheat className="w-5 h-5" />
              Resources
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>🌾 Food:</span>
                  <span className="font-bold">{resources.food}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  = {Math.floor(resources.food / 10)} credits
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>💎 Gems:</span>
                  <span className="font-bold">{resources.gems}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  = {resources.gems} diamonds
                </div>
              </div>
              <Button 
                onClick={collectRewards} 
                className="w-full"
                disabled={resources.food === 0 && resources.gems === 0 || loading}
              >
                Collect Rewards
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-muted/50 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Build Your Kingdom
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => buyBuilding('bull')} 
              disabled={credits < prices.bull || kingdom.bulls >= 100}
              className="flex flex-col h-auto py-4"
            >
              <span className="text-2xl mb-2">🐂</span>
              <span className="text-xs">Bull</span>
              <span className="text-xs font-bold">{prices.bull} 💰</span>
              <span className="text-xs text-muted-foreground">{kingdom.bulls}/100</span>
            </Button>
            <Button 
              onClick={() => buyBuilding('farm')} 
              disabled={credits < prices.farm || kingdom.farms >= 100}
              className="flex flex-col h-auto py-4"
            >
              <span className="text-2xl mb-2">🌾</span>
              <span className="text-xs">Farm</span>
              <span className="text-xs font-bold">{prices.farm} 💰</span>
              <span className="text-xs text-muted-foreground">{kingdom.farms}/100</span>
            </Button>
            <Button 
              onClick={() => buyBuilding('mine')} 
              disabled={credits < prices.mine || kingdom.mines >= 100}
              className="flex flex-col h-auto py-4"
            >
              <span className="text-2xl mb-2">⛏️</span>
              <span className="text-xs">Mine</span>
              <span className="text-xs font-bold">{prices.mine} 💰</span>
              <span className="text-xs text-muted-foreground">{kingdom.mines}/100</span>
            </Button>
            <Button 
              onClick={() => buyBuilding('castle')} 
              disabled={credits < prices.castle || kingdom.castles >= 100}
              className="flex flex-col h-auto py-4"
            >
              <span className="text-2xl mb-2">🏰</span>
              <span className="text-xs">Castle</span>
              <span className="text-xs font-bold">{prices.castle} 💰</span>
              <span className="text-xs text-muted-foreground">{kingdom.castles}/100</span>
            </Button>
          </div>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => setAutoCollect(!autoCollect)}
            size="lg"
            variant={autoCollect ? "default" : "outline"}
          >
            {autoCollect ? "⏸ Auto-Collect ON" : "▶ Start Auto-Collect"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Production every 3 seconds • Castles multiply all production by {production.bonusPerCastle}x each
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BullKingdom;
