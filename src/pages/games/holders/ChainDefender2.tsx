import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Tower {
  name: string;
  icon: string;
  damage: number;
  cost: number;
  count: number;
}

const BullFortress = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Fortress" });
  const [wave, setWave] = useState(1);
  const [gold, setGold] = useState(150);
  const [hp, setHp] = useState(100);
  const [score, setScore] = useState(0);
  const [towers, setTowers] = useState<Tower[]>([
    { name: "Archer Tower", icon: "🏹", damage: 10, cost: 30, count: 0 },
    { name: "Cannon", icon: "💣", damage: 25, cost: 60, count: 0 },
    { name: "Mage Tower", icon: "🔮", damage: 20, cost: 50, count: 0 },
    { name: "Lightning Rod", icon: "⚡", damage: 35, cost: 80, count: 0 },
  ]);
  const [log, setLog] = useState<string[]>(["🏰 Defend your fortress!"]);
  const [gameOver, setGameOver] = useState(false);

  const buildTower = (index: number) => {
    const t = towers[index];
    if (gold < t.cost || gameOver) return;
    setGold(prev => prev - t.cost);
    setTowers(prev => prev.map((tt, i) => i === index ? { ...tt, count: tt.count + 1, cost: Math.floor(tt.cost * 1.3) } : tt));
    setLog(prev => [`🏗️ Built ${t.icon} ${t.name}`, ...prev.slice(0, 8)]);
  };

  const defend = useCallback(() => {
    if (gameOver) return;
    const totalDamage = towers.reduce((s, t) => s + t.damage * t.count, 0);
    const enemyPower = 15 + wave * 12 + Math.floor(Math.random() * wave * 5);
    const difference = totalDamage - enemyPower;

    let goldEarned = 20 + wave * 10;
    let dmgTaken = 0;

    if (difference >= 0) {
      setLog(prev => [`✅ Wave ${wave} repelled! Defense: ${totalDamage} vs Enemy: ${enemyPower}`, ...prev.slice(0, 8)]);
      setScore(prev => prev + wave * 10);
    } else {
      dmgTaken = Math.min(30, Math.abs(difference));
      setHp(prev => Math.max(0, prev - dmgTaken));
      setLog(prev => [`💥 Wave ${wave}: -${dmgTaken} HP! Defense: ${totalDamage} vs Enemy: ${enemyPower}`, ...prev.slice(0, 8)]);
      goldEarned = Math.floor(goldEarned / 2);
    }

    setGold(prev => prev + goldEarned);
    setWave(prev => prev + 1);

    if (hp - dmgTaken <= 0) {
      setGameOver(true);
      if (wave >= 5) awardKeys(Math.ceil(wave / 3));
    } else if (wave >= 10) {
      setGameOver(true);
      awardKeys(Math.ceil(wave / 2));
    }
  }, [wave, towers, hp, gameOver, awardKeys]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-foreground">Loading...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">🏰 Bull Fortress</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center"><p className="text-xs text-muted-foreground">Wave</p><p className="text-lg font-bold">{wave}</p></Card>
          <Card className="p-2 text-center"><p className="text-xs text-muted-foreground">Gold</p><p className="text-lg font-bold">🪙 {gold}</p></Card>
          <Card className="p-2 text-center"><p className="text-xs text-muted-foreground">Score</p><p className="text-lg font-bold">⭐ {score}</p></Card>
          <Card className="p-2 text-center"><p className="text-xs text-muted-foreground">HP</p><p className="text-lg font-bold text-red-400">❤️ {hp}</p></Card>
        </div>

        <Progress value={hp} className="h-2" />

        <div className="grid grid-cols-2 gap-2">
          {towers.map((t, i) => (
            <Card key={t.name} className="p-3">
              <p className="font-bold text-sm text-foreground">{t.icon} {t.name} (x{t.count})</p>
              <p className="text-xs text-muted-foreground">DMG: {t.damage} | Cost: {t.cost}🪙</p>
              <Button size="sm" className="w-full mt-1" onClick={() => buildTower(i)} disabled={gold < t.cost || gameOver}>Build</Button>
            </Card>
          ))}
        </div>

        <Button className="w-full" variant="destructive" onClick={defend} disabled={gameOver}>
          ⚔️ Defend Wave {wave}
        </Button>

        {gameOver && (
          <Card className="p-4 border-primary/50 bg-primary/10 text-center">
            <p className="text-lg font-bold text-foreground">🏰 Fortress {hp > 0 ? 'Victory!' : 'Fallen!'}</p>
            <p className="text-muted-foreground">Survived {wave - 1} waves, Score: {score}</p>
            <Button className="mt-2" onClick={() => window.location.reload()}>Play Again</Button>
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

export default BullFortress;
