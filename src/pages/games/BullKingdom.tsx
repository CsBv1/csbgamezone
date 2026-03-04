import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Castle, Wheat, Users, Gem, TrendingUp } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const BullKingdom = () => {
  const navigate = useNavigate();
  const { credits, diamonds, awardDiamonds, awardCredits, deductCredits, loading } = useGameLogic("Bull Kingdom");
  
  const MAX_BUILDINGS = 30;
  
  const [kingdom, setKingdom] = useState({ bulls: 5, farms: 1, mines: 0, castles: 0 });
  const [resources, setResources] = useState({ food: 100, gems: 0 });
  const [autoCollect, setAutoCollect] = useState(false);
  const resourcesRef = useRef(resources);

  const prices = { bull: 50, farm: 200, mine: 500, castle: 1000 };
  const production = {
    foodPerFarm: 10,
    foodPerBull: 2,
    gemsPerMine: 5,
    gemsPerBullGroup: 1,
    bonusPerCastle: 1.2
  };

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    if (!autoCollect) return;

    const interval = setInterval(() => {
      const castleBonus = Math.pow(production.bonusPerCastle, kingdom.castles);
      const foodBase = kingdom.farms * production.foodPerFarm + kingdom.bulls * production.foodPerBull;
      const passiveGemsFromBulls = Math.max(1, Math.floor(kingdom.bulls / 5)) * production.gemsPerBullGroup;
      const gemsBase = kingdom.mines * production.gemsPerMine + passiveGemsFromBulls;
      
      setResources(prev => ({
        food: prev.food + Math.floor(foodBase * castleBonus),
        gems: prev.gems + Math.floor(gemsBase * castleBonus)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [autoCollect, kingdom]);

  // Auto-collect rewards every 10 seconds when auto mode is on
  useEffect(() => {
    if (!autoCollect) return;

    const collectInterval = setInterval(async () => {
      const current = resourcesRef.current;
      const creditsEarned = Math.floor(current.food / 50);
      const gemsEarned = current.gems * 5;

      if (creditsEarned <= 0 && gemsEarned <= 0) return;

      if (gemsEarned > 0) await awardDiamonds(gemsEarned);
      if (creditsEarned > 0) await awardCredits(creditsEarned);

      setResources(prev => ({ food: prev.food % 50, gems: 0 }));
    }, 10000);

    return () => clearInterval(collectInterval);
  }, [autoCollect]);

  const buyBuilding = async (type: string) => {
    const cost = prices[type as keyof typeof prices];
    const key = type === 'bull' ? 'bulls' : type === 'farm' ? 'farms' : type === 'mine' ? 'mines' : 'castles';
    if (credits < cost || kingdom[key] >= MAX_BUILDINGS || loading) return;

    const paid = await deductCredits(cost);
    if (!paid) return;

    setKingdom(prev => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const collectRewards = async () => {
    const creditsEarned = Math.floor(resources.food / 50);
    const gemsEarned = resources.gems * 5;

    if (gemsEarned > 0) await awardDiamonds(gemsEarned);
    if (creditsEarned > 0) await awardCredits(creditsEarned);

    setResources({ food: resources.food % 50, gems: 0 });
  };

  const totalPower = kingdom.bulls + kingdom.farms * 2 + kingdom.mines * 5 + kingdom.castles * 10;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-6xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🏰 Bull Kingdom</h1>
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
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Castle className="w-5 h-5" /> Kingdom Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span>🐂 Bulls:</span><span className="font-bold">{kingdom.bulls}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>🌾 Farms:</span><span className="font-bold">{kingdom.farms}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>⛏️ Mines:</span><span className="font-bold">{kingdom.mines}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>🏰 Castles:</span><span className="font-bold">{kingdom.castles}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between border-t pt-2">
                <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Total Power:</span>
                <span className="font-bold text-primary">{totalPower}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-accent/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Wheat className="w-5 h-5" /> Resources</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2"><span>🌾 Food:</span><span className="font-bold">{resources.food}</span></div>
                <div className="text-xs text-muted-foreground">= {Math.floor(resources.food / 50)} credits (remainder stays)</div>
              </div>
              <div>
                <div className="flex justify-between mb-2"><span>💎 Gems:</span><span className="font-bold">{resources.gems}</span></div>
                <div className="text-xs text-muted-foreground">= {resources.gems * 5} diamonds (bulls + mines produce gems)</div>
              </div>
              <Button onClick={collectRewards} className="w-full" disabled={(resources.food === 0 && resources.gems === 0) || loading}>Collect Rewards</Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-muted/50 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Build Your Kingdom (Max {MAX_BUILDINGS} each)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'bull', emoji: '🐂', name: 'Bull', count: kingdom.bulls },
              { type: 'farm', emoji: '🌾', name: 'Farm', count: kingdom.farms },
              { type: 'mine', emoji: '⛏️', name: 'Mine', count: kingdom.mines },
              { type: 'castle', emoji: '🏰', name: 'Castle', count: kingdom.castles },
            ].map(b => (
              <Button key={b.type} onClick={() => buyBuilding(b.type)} disabled={credits < prices[b.type as keyof typeof prices] || b.count >= MAX_BUILDINGS}
                className="flex flex-col h-auto py-4">
                <span className="text-2xl mb-2">{b.emoji}</span>
                <span className="text-xs">{b.name}</span>
                <span className="text-xs font-bold">{prices[b.type as keyof typeof prices]} 💰</span>
                <span className="text-xs text-muted-foreground">{b.count}/{MAX_BUILDINGS}</span>
              </Button>
            ))}
          </div>
        </Card>

        <div className="text-center">
          <Button onClick={() => setAutoCollect(!autoCollect)} size="lg" variant={autoCollect ? "default" : "outline"}>
            {autoCollect ? "⏸ Auto-Collect ON" : "▶ Start Auto-Collect"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Production every 3s • Bulls and mines generate 💎 • Auto-collect cashes out every 10s • Castles multiply all production by {production.bonusPerCastle}x each
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BullKingdom;
