import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const THREATS = ['🐉 Dragon', '👹 Orc Horde', '🧟 Undead', '🌊 Flood', '🔥 Wildfire', '💀 Plague'];

const ADAWarden = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "ADA Warden" });
  const [realm, setRealm] = useState({ stability: 100, population: 50, gold: 100 });
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<string[]>(['👑 You are the Warden of the realm!']);
  const [gameOver, setGameOver] = useState(false);

  const handleThreat = useCallback(async (action: 'fight' | 'diplomacy' | 'evacuate') => {
    if (gameOver) return;
    const threat = THREATS[Math.floor(Math.random() * THREATS.length)];
    const logs: string[] = [`⚠️ ${threat} approaches!`];
    const bonus = totalBulls * 3;
    let success = false;

    if (action === 'fight') {
      success = Math.random() * 100 < 50 + bonus;
      if (success) {
        const keys = Math.max(1, turn) * (1 + Math.floor(totalBulls * 0.1));
        logs.push(`⚔️ Defeated ${threat}! +${keys} 🔑`);
        await awardKeys(keys);
        setRealm(r => ({ ...r, gold: r.gold + 30 }));
      } else {
        logs.push(`❌ Battle lost! -20 stability, -10 population`);
        setRealm(r => ({ ...r, stability: r.stability - 20, population: Math.max(0, r.population - 10) }));
      }
    } else if (action === 'diplomacy') {
      success = Math.random() * 100 < 40 + bonus;
      if (success) {
        logs.push(`🤝 Diplomacy succeeded! Threat averted.`);
        setRealm(r => ({ ...r, stability: Math.min(100, r.stability + 10) }));
      } else {
        logs.push(`💔 Diplomacy failed! -15 stability`);
        setRealm(r => ({ ...r, stability: r.stability - 15 }));
      }
    } else {
      setRealm(r => ({ ...r, population: Math.max(0, r.population - 5), gold: r.gold - 10 }));
      logs.push(`🏃 Evacuated! Lost 5 pop, 10 gold, but stability held.`);
    }

    setTurn(t => t + 1);
    setRealm(r => ({ ...r, gold: r.gold + r.population }));
    logs.push(`📅 Turn ${turn + 1}: +${realm.population} gold from taxes`);

    if (realm.stability - (success ? 0 : action === 'fight' ? 20 : 15) <= 0) {
      logs.push(`💀 Realm collapsed! Survived ${turn} turns.`);
      setGameOver(true);
    }
    setLog([...logs, ...log].slice(0, 10));
  }, [gameOver, turn, realm, totalBulls, log, awardKeys]);

  const reset = () => { setRealm({ stability: 100, population: 50, gold: 100 }); setTurn(1); setLog(['👑 New realm established!']); setGameOver(false); };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading ADA Warden...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">👑 ADA Warden</h1>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><span>🏛️ Stability</span><Progress value={realm.stability} className="flex-1 h-3" /><span>{realm.stability}%</span></div>
          <div className="flex gap-4 text-sm text-foreground justify-center">
            <span>👥 {realm.population}</span><span>💰 {realm.gold}</span><span>📅 Turn {turn}</span>
          </div>
        </div>
        <p className="text-center text-foreground font-medium">A threat approaches! How do you respond?</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => handleThreat('fight')} disabled={gameOver}>⚔️ Fight</Button>
          <Button variant="outline" onClick={() => handleThreat('diplomacy')} disabled={gameOver}>🤝 Diplomacy</Button>
          <Button variant="outline" onClick={() => handleThreat('evacuate')} disabled={gameOver}>🏃 Evacuate</Button>
        </div>
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 New Realm</Button>}
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-1">
          {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
        </CardContent></Card>
      </div>
    </div>
  );
};

export default ADAWarden;
