import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Building {
  name: string;
  icon: string;
  cost: number;
  income: number;
  count: number;
}

const StakeFoundry = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Stake Foundry" });
  const [turn, setTurn] = useState(1);
  const [gold, setGold] = useState(200);
  const [reputation, setReputation] = useState(0);
  const [buildings, setBuildings] = useState<Building[]>([
    { name: "Mine", icon: "⛏️", cost: 50, income: 15, count: 0 },
    { name: "Market", icon: "🏪", cost: 80, income: 25, count: 0 },
    { name: "Temple", icon: "🏛️", cost: 120, income: 35, count: 0 },
    { name: "Fortress", icon: "🏰", cost: 200, income: 60, count: 0 },
    { name: "Academy", icon: "📚", cost: 150, income: 45, count: 0 },
  ]);
  const [log, setLog] = useState<string[]>(["🏗️ Your foundry city awaits..."]);
  const [gameOver, setGameOver] = useState(false);

  const build = useCallback((index: number) => {
    const b = buildings[index];
    if (gold < b.cost) return;
    setGold(prev => prev - b.cost);
    setReputation(prev => prev + 10);
    setBuildings(prev => prev.map((bb, i) => i === index ? { ...bb, count: bb.count + 1, cost: Math.floor(bb.cost * 1.4) } : bb));
    setLog(prev => [`🏗️ Built ${b.icon} ${b.name} (${b.count + 1})`, ...prev.slice(0, 8)]);
  }, [buildings, gold]);

  const endTurn = () => {
    const income = buildings.reduce((sum, b) => sum + b.income * b.count, 0);
    const event = Math.random();
    let eventText = "";
    let bonus = 0;

    if (event < 0.15) { bonus = -30; eventText = "🌪️ Storm damaged your city! -30 gold"; }
    else if (event < 0.3) { bonus = 50; eventText = "🎉 Festival! +50 gold bonus"; }
    else if (event < 0.4) { bonus = 0; eventText = "📜 Peaceful turn"; setReputation(prev => prev + 5); }

    setGold(prev => prev + income + bonus);
    setTurn(prev => prev + 1);
    setLog(prev => [`📅 Turn ${turn}: +${income} gold income${eventText ? ` | ${eventText}` : ''}`, ...prev.slice(0, 8)]);

    if (turn >= 12) {
      setGameOver(true);
      const totalBuildings = buildings.reduce((s, b) => s + b.count, 0);
      if (totalBuildings >= 8) awardKeys(Math.ceil(totalBuildings / 4));
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-foreground">Loading...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">🏗️ Stake Foundry</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gold</p><p className="text-lg font-bold">🪙 {gold}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Reputation</p><p className="text-lg font-bold">⭐ {reputation}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Turn</p><p className="text-lg font-bold">{turn}/12</p></Card>
        </div>

        <div className="space-y-2">
          {buildings.map((b, i) => (
            <Card key={b.name} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">{b.icon} {b.name} (x{b.count})</p>
                <p className="text-xs text-muted-foreground">+{b.income}/turn | Cost: {b.cost}🪙</p>
              </div>
              <Button size="sm" onClick={() => build(i)} disabled={gold < b.cost || gameOver}>Build</Button>
            </Card>
          ))}
        </div>

        <Button className="w-full" onClick={endTurn} disabled={gameOver}>
          End Turn ({turn}/12)
        </Button>

        {gameOver && (
          <Card className="p-4 border-primary/50 bg-primary/10 text-center">
            <p className="text-lg font-bold text-foreground">🏗️ Foundry Complete!</p>
            <p className="text-muted-foreground">{buildings.reduce((s, b) => s + b.count, 0)} buildings, {reputation} reputation</p>
            <Button className="mt-2" onClick={() => window.location.reload()}>Play Again</Button>
          </Card>
        )}

        <Card className="p-3">
          <p className="text-xs font-bold text-foreground mb-1">Event Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {log.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StakeFoundry;
