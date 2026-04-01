import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LOCATIONS = [
  { name: '🌲 Ancient Forest', danger: 15, loot: [2, 5] },
  { name: '⛰️ Crystal Caves', danger: 30, loot: [4, 8] },
  { name: '🏜️ Desert Ruins', danger: 45, loot: [6, 12] },
  { name: '🌋 Volcanic Depths', danger: 60, loot: [8, 16] },
  { name: '🏰 Dragon\'s Lair', danger: 80, loot: [12, 25] },
];

const BullExplorer = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Explorer" });
  const [hp, setHp] = useState(100);
  const [supplies, setSupplies] = useState(5);
  const [keysFound, setKeysFound] = useState(0);
  const [log, setLog] = useState<string[]>(['🗺️ Your expedition begins!']);
  const [gameOver, setGameOver] = useState(false);

  const explore = useCallback(async (locIdx: number) => {
    if (gameOver || supplies <= 0) return;
    const loc = LOCATIONS[locIdx];
    setSupplies(s => s - 1);
    const survivalBonus = totalBulls * 3;
    const survived = Math.random() * 100 > loc.danger - survivalBonus;
    const logs: string[] = [];

    if (survived) {
      const loot = loc.loot[0] + Math.floor(Math.random() * (loc.loot[1] - loc.loot[0] + 1));
      const bonusLoot = Math.floor(loot * totalBulls * 0.1);
      const total = loot + bonusLoot;
      setKeysFound(k => k + total);
      logs.push(`✅ ${loc.name}: Found ${total} 🔑!`);
      if (Math.random() < 0.3) {
        setSupplies(s => s + 1);
        logs.push(`🎒 Found extra supplies!`);
      }
    } else {
      const dmg = 15 + Math.floor(Math.random() * 20);
      setHp(h => Math.max(0, h - dmg));
      logs.push(`❌ ${loc.name}: Took ${dmg} damage!`);
      if (hp - dmg <= 0) {
        logs.push(`💀 Expedition failed! Lost all findings.`);
        setGameOver(true);
      }
    }

    if (supplies <= 1 && !gameOver) {
      if (keysFound > 0) {
        await awardKeys(keysFound);
        logs.push(`🏆 Returned home with ${keysFound} 🔑!`);
      }
      logs.push(`📦 Out of supplies!`);
      setGameOver(true);
    }
    setLog([...logs, ...log].slice(0, 10));
  }, [gameOver, supplies, hp, keysFound, totalBulls, log, awardKeys]);

  const returnHome = useCallback(async () => {
    if (keysFound > 0) await awardKeys(keysFound);
    setLog(prev => [`🏠 Returned safely with ${keysFound} 🔑!`, ...prev]);
    setGameOver(true);
  }, [keysFound, awardKeys]);

  const reset = () => { setHp(100); setSupplies(5); setKeysFound(0); setLog(['🗺️ New expedition!']); setGameOver(false); };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Bull Explorer...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🗺️ Bull Explorer</h1>
        </div>
        <div className="flex gap-3 text-sm text-foreground justify-center">
          <span>❤️ {hp}</span><span>🎒 {supplies}</span><span>🔑 {keysFound}</span>
        </div>
        {LOCATIONS.map((loc, i) => (
          <Button key={i} variant="outline" className="w-full justify-between" onClick={() => explore(i)} disabled={gameOver || supplies <= 0}>
            <span>{loc.name}</span>
            <span className="text-xs text-muted-foreground">⚠️{loc.danger}% | 🔑{loc.loot[0]}-{loc.loot[1]}</span>
          </Button>
        ))}
        {!gameOver && keysFound > 0 && <Button onClick={returnHome} variant="secondary" className="w-full">🏠 Return Home ({keysFound} 🔑)</Button>}
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 New Expedition</Button>}
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-1">
          {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
        </CardContent></Card>
      </div>
    </div>
  );
};

export default BullExplorer;
