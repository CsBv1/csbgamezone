import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Territory {
  id: number;
  name: string;
  controlled: boolean;
  defense: number;
  reward: number;
}

const TERRITORIES: Territory[] = [
  { id: 1, name: "Crystal Plains", controlled: false, defense: 20, reward: 50 },
  { id: 2, name: "Iron Ridge", controlled: false, defense: 35, reward: 80 },
  { id: 3, name: "Shadow Valley", controlled: false, defense: 50, reward: 120 },
  { id: 4, name: "Gold Summit", controlled: false, defense: 65, reward: 160 },
  { id: 5, name: "Diamond Citadel", controlled: false, defense: 80, reward: 200 },
  { id: 6, name: "Dragon's Keep", controlled: false, defense: 95, reward: 300 },
];

const BullConqueror = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Conqueror" });
  const [territories, setTerritories] = useState<Territory[]>(TERRITORIES);
  const [army, setArmy] = useState(100);
  const [gold, setGold] = useState(0);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<string[]>(["🏴 Your conquest begins..."]);
  const [gameOver, setGameOver] = useState(false);

  const attack = useCallback((territory: Territory) => {
    if (territory.controlled || army <= 0) return;
    const power = army + Math.floor(Math.random() * 40);
    const defense = territory.defense + Math.floor(Math.random() * 30);
    const won = power > defense;
    const losses = Math.floor(Math.random() * 20) + 5;

    setArmy(prev => Math.max(0, prev - losses));
    setTurn(prev => prev + 1);

    if (won) {
      setTerritories(prev => prev.map(t => t.id === territory.id ? { ...t, controlled: true } : t));
      setGold(prev => prev + territory.reward);
      setLog(prev => [`⚔️ T${turn}: Conquered ${territory.name}! +${territory.reward} gold, -${losses} troops`, ...prev.slice(0, 8)]);
    } else {
      setLog(prev => [`💀 T${turn}: Failed to take ${territory.name}! -${losses} troops`, ...prev.slice(0, 8)]);
    }

    const allControlled = territories.filter(t => t.id !== territory.id).every(t => t.controlled) && won;
    if (allControlled || army - losses <= 0) {
      setGameOver(true);
      const controlled = territories.filter(t => t.controlled).length + (won ? 1 : 0);
      if (controlled >= 4) awardKeys(Math.ceil(controlled / 2));
    }
  }, [army, turn, territories, awardKeys]);

  const recruit = () => {
    if (gold < 50) return;
    setGold(prev => prev - 50);
    setArmy(prev => prev + 30);
    setLog(prev => ["🛡️ Recruited 30 troops for 50 gold", ...prev.slice(0, 8)]);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-foreground">Loading...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">🏴 Bull Conqueror</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Army</p><p className="text-lg font-bold">⚔️ {army}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gold</p><p className="text-lg font-bold">🪙 {gold}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Turn</p><p className="text-lg font-bold">📅 {turn}</p></Card>
        </div>

        <Button variant="outline" size="sm" onClick={recruit} disabled={gold < 50 || gameOver}>
          🛡️ Recruit Troops (50 gold)
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {territories.map(t => (
            <Card key={t.id} className={`p-3 ${t.controlled ? 'border-green-500/50 bg-green-500/10' : 'border-destructive/30'}`}>
              <p className="font-bold text-sm text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">Defense: {t.defense} | Reward: {t.reward}🪙</p>
              <Progress value={t.controlled ? 100 : 0} className="h-1 my-1" />
              <Button size="sm" variant={t.controlled ? "outline" : "default"} className="w-full mt-1" onClick={() => attack(t)} disabled={t.controlled || gameOver || army <= 0}>
                {t.controlled ? "✅ Controlled" : "⚔️ Attack"}
              </Button>
            </Card>
          ))}
        </div>

        {gameOver && (
          <Card className="p-4 border-primary/50 bg-primary/10 text-center">
            <p className="text-lg font-bold text-foreground">🏴 Conquest Complete!</p>
            <p className="text-muted-foreground">{territories.filter(t => t.controlled).length}/6 territories conquered</p>
            <Button className="mt-2" onClick={() => { setTerritories(TERRITORIES); setArmy(100); setGold(0); setTurn(1); setGameOver(false); setLog(["🏴 New conquest begins..."]); }}>Play Again</Button>
          </Card>
        )}

        <Card className="p-3">
          <p className="text-xs font-bold text-foreground mb-1">Battle Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {log.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullConqueror;
