import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Unit {
  id: number;
  type: 'infantry' | 'cavalry' | 'siege' | 'mage';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

const UNIT_TEMPLATES = {
  infantry: { hp: 100, attack: 15, defense: 20, icon: '⚔️', cost: 10 },
  cavalry: { hp: 80, attack: 25, defense: 10, icon: '🐎', cost: 15 },
  siege: { hp: 60, attack: 40, defense: 5, icon: '🏰', cost: 25 },
  mage: { hp: 50, attack: 35, defense: 8, icon: '🔮', cost: 20 },
};

const BullVanguard = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Vanguard" });
  const [army, setArmy] = useState<Unit[]>([]);
  const [resources, setResources] = useState(100);
  const [wave, setWave] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattling, setIsBattling] = useState(false);
  const [score, setScore] = useState(0);

  const recruitUnit = useCallback((type: keyof typeof UNIT_TEMPLATES) => {
    const template = UNIT_TEMPLATES[type];
    if (resources < template.cost || army.length >= 8) return;
    setResources(r => r - template.cost);
    setArmy(prev => [...prev, {
      id: Date.now(),
      type,
      hp: template.hp,
      maxHp: template.hp,
      attack: template.attack,
      defense: template.defense,
    }]);
  }, [resources, army.length]);

  const startBattle = useCallback(async () => {
    if (army.length === 0 || isBattling) return;
    setIsBattling(true);
    const logs: string[] = [];
    let currentArmy = [...army];
    const enemyCount = wave + 2;
    let enemyHp = wave * 80;
    const enemyAttack = wave * 8;

    logs.push(`⚡ Wave ${wave}: ${enemyCount} enemies attack!`);

    for (let round = 0; round < 5 && currentArmy.length > 0 && enemyHp > 0; round++) {
      const totalDmg = currentArmy.reduce((sum, u) => sum + u.attack, 0);
      enemyHp -= totalDmg;
      logs.push(`🗡️ Your army deals ${totalDmg} damage! Enemy HP: ${Math.max(0, enemyHp)}`);

      if (enemyHp <= 0) break;

      const targetIdx = Math.floor(Math.random() * currentArmy.length);
      const dmgTaken = Math.max(1, enemyAttack - currentArmy[targetIdx].defense);
      currentArmy[targetIdx] = { ...currentArmy[targetIdx], hp: currentArmy[targetIdx].hp - dmgTaken };
      logs.push(`💥 Enemy hits your ${currentArmy[targetIdx].type} for ${dmgTaken}!`);

      if (currentArmy[targetIdx].hp <= 0) {
        logs.push(`💀 Your ${currentArmy[targetIdx].type} has fallen!`);
        currentArmy = currentArmy.filter((_, i) => i !== targetIdx);
      }
    }

    if (enemyHp <= 0) {
      const keysWon = wave * (1 + Math.floor(totalBulls * 0.1));
      logs.push(`🏆 Wave ${wave} cleared! +${keysWon} 🔑`);
      setScore(s => s + wave * 100);
      setWave(w => w + 1);
      setResources(r => r + 30 + wave * 5);
      await awardKeys(keysWon);
    } else {
      logs.push(`❌ Wave ${wave} failed! Rebuild your army.`);
    }

    setArmy(currentArmy);
    setBattleLog(logs);
    setIsBattling(false);
  }, [army, wave, isBattling, totalBulls, awardKeys]);

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Bull Vanguard...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">⚔️ Bull Vanguard</h1>
          <span className="text-sm text-muted-foreground">Score: {score}</span>
        </div>

        <div className="flex gap-4 text-sm text-foreground">
          <span>💰 Resources: {resources}</span>
          <span>🌊 Wave: {wave}</span>
          <span>🐂 Bulls: {totalBulls}</span>
        </div>

        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recruit Units ({army.length}/8)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-2">
            {(Object.entries(UNIT_TEMPLATES) as [keyof typeof UNIT_TEMPLATES, typeof UNIT_TEMPLATES[keyof typeof UNIT_TEMPLATES]][]).map(([type, t]) => (
              <Button key={type} variant="outline" size="sm" onClick={() => recruitUnit(type)} disabled={resources < t.cost || army.length >= 8}>
                {t.icon} {t.cost}💰
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Your Army</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {army.map(u => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                <span>{UNIT_TEMPLATES[u.type].icon}</span>
                <Progress value={(u.hp / u.maxHp) * 100} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground">{u.hp}/{u.maxHp}</span>
              </div>
            ))}
            {army.length === 0 && <p className="text-muted-foreground text-sm">No units recruited yet</p>}
          </CardContent>
        </Card>

        <Button onClick={startBattle} disabled={army.length === 0 || isBattling} className="w-full bg-primary">
          {isBattling ? '⚔️ Fighting...' : `⚔️ Fight Wave ${wave}`}
        </Button>

        {battleLog.length > 0 && (
          <Card className="border-primary/30">
            <CardContent className="pt-4 space-y-1">
              {battleLog.map((log, i) => <p key={i} className="text-xs text-foreground">{log}</p>)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BullVanguard;
