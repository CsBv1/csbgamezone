import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Territory { name: string; control: number; income: number; risk: number; }

const TERRITORIES: Territory[] = [
  { name: '🏙️ Downtown', control: 0, income: 5, risk: 20 },
  { name: '🏭 Industrial', control: 0, income: 8, risk: 35 },
  { name: '🌃 Nightlife', control: 0, income: 12, risk: 50 },
  { name: '🏦 Financial', control: 0, income: 20, risk: 70 },
];

const BullCartel = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Cartel" });
  const [territories, setTerritories] = useState(TERRITORIES);
  const [cash, setCash] = useState(50);
  const [rep, setRep] = useState(0);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<string[]>([]);

  const expand = useCallback((idx: number) => {
    const t = territories[idx];
    if (cash < 10 || t.control >= 100) return;
    setCash(c => c - 10);
    const bonus = totalBulls * 2;
    const success = Math.random() * 100 > t.risk - bonus;
    if (success) {
      const gain = Math.min(100, t.control + 25);
      setTerritories(prev => prev.map((ter, i) => i === idx ? { ...ter, control: gain } : ter));
      setLog(prev => [`✅ Expanded ${t.name} to ${gain}%`, ...prev.slice(0, 9)]);
    } else {
      setLog(prev => [`❌ Failed to expand ${t.name}!`, ...prev.slice(0, 9)]);
    }
  }, [territories, cash, totalBulls]);

  const collect = useCallback(async () => {
    const income = territories.reduce((sum, t) => sum + Math.floor(t.income * t.control / 100), 0);
    setCash(c => c + income);
    setRep(r => r + income);
    setTurn(t => t + 1);
    setLog(prev => [`💰 Turn ${turn}: Collected ${income} cash`, ...prev.slice(0, 9)]);
    if (turn > 0 && turn % 5 === 0) {
      const keysWon = Math.floor(rep / 10) * (1 + Math.floor(totalBulls * 0.1));
      if (keysWon > 0) {
        await awardKeys(keysWon);
        setLog(prev => [`🔑 Milestone! +${keysWon} keys`, ...prev.slice(0, 9)]);
      }
    }
  }, [territories, turn, rep, totalBulls, awardKeys]);

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Bull Cartel...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🎩 Bull Cartel</h1>
        </div>
        <div className="flex gap-4 text-sm text-foreground">
          <span>💰 {cash}</span><span>⭐ Rep: {rep}</span><span>📅 Turn: {turn}</span>
        </div>
        {territories.map((t, i) => (
          <Card key={i} className="border-primary/30">
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">Control: {t.control}% | Income: {Math.floor(t.income * t.control / 100)}/turn</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => expand(i)} disabled={cash < 10 || t.control >= 100}>
                Expand (10💰)
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button onClick={collect} className="w-full bg-primary">💰 End Turn & Collect</Button>
        {log.length > 0 && (
          <Card className="border-primary/30">
            <CardContent className="pt-4 space-y-1">
              {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BullCartel;
