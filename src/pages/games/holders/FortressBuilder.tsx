import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Hammer, Users, Coins } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

interface Building {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  goldPerTick: number;
  populationCost: number;
  count: number;
}

export default function FortressBuilder() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Fortress Builder" 
  });
  
  const [gold, setGold] = useState(50);
  const [population, setPopulation] = useState(10);
  const [day, setDay] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  
  const bonusMultiplier = 1 + (bullsOwned * 0.1);
  
  const [buildings, setBuildings] = useState<Building[]>([
    { id: 'farm', name: 'Farm', emoji: '🌾', cost: 20, goldPerTick: 5, populationCost: 2, count: 0 },
    { id: 'mine', name: 'Mine', emoji: '⛏️', cost: 50, goldPerTick: 15, populationCost: 5, count: 0 },
    { id: 'market', name: 'Market', emoji: '🏪', cost: 100, goldPerTick: 30, populationCost: 8, count: 0 },
    { id: 'bank', name: 'Bank', emoji: '🏦', cost: 250, goldPerTick: 75, populationCost: 12, count: 0 },
    { id: 'house', name: 'House', emoji: '🏠', cost: 30, goldPerTick: 0, populationCost: -5, count: 0 },
  ]);

  const DAYS_TO_WIN = 30;
  const TARGET_GOLD = 5000;

  const usedPopulation = buildings.reduce((sum, b) => sum + (b.populationCost > 0 ? b.populationCost * b.count : 0), 0);
  const availablePopulation = population - usedPopulation;
  const goldPerDay = Math.floor(buildings.reduce((sum, b) => sum + b.goldPerTick * b.count, 0) * bonusMultiplier);

  const build = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || gold < building.cost) return;
    if (building.populationCost > 0 && availablePopulation < building.populationCost) return;
    
    setGold(g => g - building.cost);
    if (building.populationCost < 0) {
      setPopulation(p => p - building.populationCost);
    }
    setBuildings(prev => prev.map(b => 
      b.id === buildingId ? { ...b, count: b.count + 1 } : b
    ));
  };

  const nextDay = async () => {
    if (day >= DAYS_TO_WIN) {
      setGameOver(true);
      if (gold >= TARGET_GOLD) {
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        await awardKeys(keys);
      }
      return;
    }
    
    setGold(g => g + goldPerDay);
    setDay(d => d + 1);
  };

  const resetGame = () => {
    setGold(50);
    setPopulation(10);
    setDay(1);
    setGameOver(false);
    setKeysEarned(0);
    setBuildings([
      { id: 'farm', name: 'Farm', emoji: '🌾', cost: 20, goldPerTick: 5, populationCost: 2, count: 0 },
      { id: 'mine', name: 'Mine', emoji: '⛏️', cost: 50, goldPerTick: 15, populationCost: 5, count: 0 },
      { id: 'market', name: 'Market', emoji: '🏪', cost: 100, goldPerTick: 30, populationCost: 8, count: 0 },
      { id: 'bank', name: 'Bank', emoji: '🏦', cost: 250, goldPerTick: 75, populationCost: 12, count: 0 },
      { id: 'house', name: 'House', emoji: '🏠', cost: 30, goldPerTick: 0, populationCost: -5, count: 0 },
    ]);
  };

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
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Building className="w-8 h-8 text-amber-500" />
            Fortress Builder
          </h1>
          <p className="text-muted-foreground">Reach {TARGET_GOLD}g in {DAYS_TO_WIN} days!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = {Math.round(bonusMultiplier * 100)}% income multiplier</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gold >= TARGET_GOLD ? '🏰' : '🏚️'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {gold >= TARGET_GOLD ? 'Fortress Complete!' : 'Time Ran Out!'}
            </h2>
            <p className="text-lg mb-2">Final Gold: {gold}g</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Build Again</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm">
              <div className="bg-muted/50 rounded p-2 text-center">
                <Coins className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                <div className="font-bold">{gold}g</div>
                <div className="text-xs text-green-400">+{goldPerDay}/day</div>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <Users className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <div className="font-bold">{availablePopulation}/{population}</div>
                <div className="text-xs">Population</div>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <span className="text-lg">📅</span>
                <div className="font-bold">{day}/{DAYS_TO_WIN}</div>
                <div className="text-xs">Day</div>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <span className="text-lg">🎯</span>
                <div className="font-bold">{Math.min(100, Math.floor((gold / TARGET_GOLD) * 100))}%</div>
                <div className="text-xs">Progress</div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {buildings.map(building => {
                const canAfford = gold >= building.cost;
                const hasPopulation = building.populationCost <= 0 || availablePopulation >= building.populationCost;
                const canBuild = canAfford && hasPopulation;
                
                return (
                  <div key={building.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{building.emoji}</span>
                      <div>
                        <div className="font-bold">{building.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {building.goldPerTick > 0 && `+${building.goldPerTick}g/day`}
                          {building.populationCost < 0 && `+${-building.populationCost} pop`}
                          {building.populationCost > 0 && ` | ${building.populationCost} pop`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">x{building.count}</span>
                      <Button
                        size="sm"
                        onClick={() => build(building.id)}
                        disabled={!canBuild}
                      >
                        <Hammer className="w-4 h-4 mr-1" />
                        {building.cost}g
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={nextDay} className="w-full" size="lg">
              Next Day → (+{goldPerDay}g)
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
