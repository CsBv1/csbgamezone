import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VAULT_LAYERS = ['🔒 Bronze Gate', '🔐 Silver Gate', '🗝️ Gold Gate', '💎 Diamond Gate', '👑 Crown Vault'];

const ADAVault = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "ADA Vault" });
  const [currentLayer, setCurrentLayer] = useState(0);
  const [tools, setTools] = useState({ picks: 3, dynamite: 1, keys: 2 });
  const [loot, setLoot] = useState(0);
  const [log, setLog] = useState<string[]>(['🏦 You stand before the ADA Vault...']);
  const [gameOver, setGameOver] = useState(false);

  const attemptBreak = useCallback(async (tool: 'picks' | 'dynamite' | 'keys') => {
    if (gameOver || tools[tool] <= 0) return;
    setTools(prev => ({ ...prev, [tool]: prev[tool] - 1 }));
    const successChance = tool === 'dynamite' ? 0.9 : tool === 'keys' ? 0.7 : 0.5;
    const bonusChance = totalBulls * 0.02;
    const success = Math.random() < (successChance + bonusChance);

    if (success) {
      const layerLoot = (currentLayer + 1) * 2;
      setLoot(l => l + layerLoot);
      setLog(prev => [...prev, `✅ ${VAULT_LAYERS[currentLayer]} breached! +${layerLoot} 🔑`]);
      if (currentLayer >= VAULT_LAYERS.length - 1) {
        const bonus = 10 * (1 + Math.floor(totalBulls * 0.1));
        setLog(prev => [...prev, `👑 FULL VAULT CRACKED! Bonus: +${bonus} 🔑`]);
        setLoot(l => l + bonus);
        await awardKeys(loot + layerLoot + bonus);
        setGameOver(true);
      } else {
        setCurrentLayer(c => c + 1);
      }
    } else {
      setLog(prev => [...prev, `❌ Failed to breach ${VAULT_LAYERS[currentLayer]}!`]);
      const allUsed = Object.values({ ...tools, [tool]: tools[tool] - 1 }).every(v => v <= 0);
      if (allUsed) {
        setLog(prev => [...prev, `💀 No tools left! Vault secured. Earned ${loot} 🔑`]);
        if (loot > 0) await awardKeys(loot);
        setGameOver(true);
      }
    }
  }, [currentLayer, tools, loot, gameOver, totalBulls, awardKeys]);

  const reset = () => {
    setCurrentLayer(0);
    setTools({ picks: 3, dynamite: 1, keys: 2 });
    setLoot(0);
    setLog(['🏦 You stand before the ADA Vault...']);
    setGameOver(false);
  };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading ADA Vault...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🏦 ADA Vault</h1>
        </div>
        <div className="text-center text-2xl py-4">{VAULT_LAYERS[Math.min(currentLayer, VAULT_LAYERS.length - 1)]}</div>
        <div className="flex justify-center gap-4 text-sm text-foreground">
          <span>Layer: {currentLayer + 1}/{VAULT_LAYERS.length}</span>
          <span>Loot: {loot} 🔑</span>
        </div>
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tools</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" disabled={gameOver || tools.picks <= 0} onClick={() => attemptBreak('picks')}>⛏️ Pick ({tools.picks})</Button>
            <Button variant="outline" size="sm" disabled={gameOver || tools.dynamite <= 0} onClick={() => attemptBreak('dynamite')}>💣 TNT ({tools.dynamite})</Button>
            <Button variant="outline" size="sm" disabled={gameOver || tools.keys <= 0} onClick={() => attemptBreak('keys')}>🗝️ Key ({tools.keys})</Button>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="pt-4 max-h-40 overflow-y-auto space-y-1">
            {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
          </CardContent>
        </Card>
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 Try Again</Button>}
      </div>
    </div>
  );
};

export default ADAVault;
