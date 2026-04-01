import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const CryptoSiege = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Crypto Siege" });
  const [walls, setWalls] = useState(100);
  const [troops, setTroops] = useState(20);
  const [gold, setGold] = useState(100);
  const [wave, setWave] = useState(1);
  const [log, setLog] = useState<string[]>(['🏰 Your fortress awaits defense!']);
  const [gameOver, setGameOver] = useState(false);

  const buildWalls = () => {
    if (gold < 20) return;
    setGold(g => g - 20);
    setWalls(w => Math.min(100, w + 25));
    setLog(prev => ['🧱 Walls reinforced +25', ...prev].slice(0, 8));
  };

  const recruitTroops = () => {
    if (gold < 15) return;
    setGold(g => g - 15);
    setTroops(t => t + 10);
    setLog(prev => ['⚔️ Recruited 10 troops', ...prev].slice(0, 8));
  };

  const defend = useCallback(async () => {
    if (gameOver) return;
    const enemyPower = wave * 15 + Math.floor(Math.random() * wave * 10);
    const defensePower = troops * 2 + walls + totalBulls * 5;
    const logs: string[] = [];
    logs.push(`🌊 Wave ${wave}: Enemy power ${enemyPower} vs Defense ${defensePower}`);

    if (defensePower >= enemyPower) {
      const loot = wave * 20 + Math.floor(Math.random() * 30);
      const keysWon = Math.max(1, Math.floor(wave * 0.5) * (1 + Math.floor(totalBulls * 0.1)));
      setGold(g => g + loot);
      logs.push(`🏆 Wave ${wave} repelled! +${loot} gold, +${keysWon} 🔑`);
      await awardKeys(keysWon);
      setTroops(t => Math.max(5, t - Math.floor(enemyPower / 10)));
      setWalls(w => Math.max(10, w - Math.floor(enemyPower / 8)));
      setWave(w => w + 1);
    } else {
      logs.push(`💀 Fortress breached! Game over at wave ${wave}`);
      const finalKeys = Math.floor(wave / 2);
      if (finalKeys > 0) { await awardKeys(finalKeys); logs.push(`Salvaged ${finalKeys} 🔑`); }
      setGameOver(true);
    }
    setLog([...logs, ...log].slice(0, 10));
  }, [gameOver, wave, troops, walls, totalBulls, gold, log, awardKeys]);

  const reset = () => { setWalls(100); setTroops(20); setGold(100); setWave(1); setLog(['🏰 New fortress raised!']); setGameOver(false); };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Crypto Siege...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🏰 Crypto Siege</h1>
        </div>
        <div className="flex gap-3 text-sm text-foreground justify-center">
          <span>💰 {gold}</span><span>⚔️ {troops}</span><span>🌊 Wave {wave}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><span>🧱 Walls</span><Progress value={walls} className="flex-1 h-3" /><span>{walls}%</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={buildWalls} disabled={gold < 20 || gameOver}>🧱 Walls (20g)</Button>
          <Button variant="outline" onClick={recruitTroops} disabled={gold < 15 || gameOver}>⚔️ Recruit (15g)</Button>
        </div>
        <Button onClick={defend} disabled={gameOver} className="w-full bg-primary">⚔️ Defend Wave {wave}</Button>
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 Rebuild</Button>}
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-1">
          {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
        </CardContent></Card>
      </div>
    </div>
  );
};

export default CryptoSiege;
