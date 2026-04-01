import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SPELLS = ['🔥 Fireball', '❄️ Ice Shard', '⚡ Thunder', '🌿 Nature', '💀 Shadow', '✨ Holy'];
const ENEMIES = ['🐉 Dragon', '👻 Wraith', '🧌 Troll', '🦂 Scorpion', '🐍 Serpent', '💀 Lich'];

const BullMystic = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Mystic" });
  const [mana, setMana] = useState(100);
  const [hp, setHp] = useState(100);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [enemyHp, setEnemyHp] = useState(50);
  const [kills, setKills] = useState(0);
  const [log, setLog] = useState<string[]>(['🧙 A dark dungeon awaits...']);
  const [gameOver, setGameOver] = useState(false);

  const castSpell = useCallback(async (spellIdx: number) => {
    if (gameOver || mana < 15) return;
    setMana(m => m - 15);
    const dmg = 20 + Math.floor(Math.random() * 15) + totalBulls * 2;
    const newEnemyHp = enemyHp - dmg;
    const logs: string[] = [];

    logs.push(`${SPELLS[spellIdx]} deals ${dmg} to ${ENEMIES[enemyIdx]}!`);

    if (newEnemyHp <= 0) {
      const keysWon = Math.max(1, Math.floor((kills + 1) * 0.5) * (1 + Math.floor(totalBulls * 0.1)));
      logs.push(`💀 ${ENEMIES[enemyIdx]} defeated! +${keysWon} 🔑`);
      await awardKeys(keysWon);
      setKills(k => k + 1);
      const nextEnemy = (enemyIdx + 1) % ENEMIES.length;
      setEnemyIdx(nextEnemy);
      setEnemyHp(50 + kills * 15);
      setMana(m => Math.min(100, m + 20));
    } else {
      setEnemyHp(newEnemyHp);
      const enemyDmg = 10 + kills * 3;
      const newHp = hp - enemyDmg;
      logs.push(`${ENEMIES[enemyIdx]} strikes back for ${enemyDmg}!`);
      if (newHp <= 0) {
        logs.push(`💀 You have fallen! Kills: ${kills}`);
        setGameOver(true);
      }
      setHp(Math.max(0, newHp));
    }
    setLog(prev => [...logs, ...prev].slice(0, 10));
  }, [gameOver, mana, enemyHp, enemyIdx, kills, hp, totalBulls, awardKeys]);

  const meditate = () => {
    if (gameOver) return;
    setMana(m => Math.min(100, m + 30));
    const dmg = 5 + kills * 2;
    setHp(h => Math.max(0, h - dmg));
    setLog(prev => [`🧘 Meditated (+30 mana), enemy strikes for ${dmg}`, ...prev].slice(0, 10));
    if (hp - dmg <= 0) setGameOver(true);
  };

  const reset = () => { setMana(100); setHp(100); setEnemyIdx(0); setEnemyHp(50); setKills(0); setLog(['🧙 A dark dungeon awaits...']); setGameOver(false); };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Bull Mystic...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🧙 Bull Mystic</h1>
        </div>
        <div className="flex gap-3 text-sm text-foreground justify-center">
          <span>❤️ {hp}</span><span>💧 {mana}</span><span>💀 Kills: {kills}</span>
        </div>
        <Card className="border-primary/30 text-center">
          <CardContent className="pt-4">
            <p className="text-lg">{ENEMIES[enemyIdx]}</p>
            <p className="text-sm text-muted-foreground">HP: {enemyHp}</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-2">
          {SPELLS.map((s, i) => (
            <Button key={i} variant="outline" size="sm" onClick={() => castSpell(i)} disabled={gameOver || mana < 15}>{s}</Button>
          ))}
        </div>
        <Button variant="secondary" onClick={meditate} disabled={gameOver} className="w-full">🧘 Meditate (+30 mana)</Button>
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 Resurrect</Button>}
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-1">
            {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BullMystic;
