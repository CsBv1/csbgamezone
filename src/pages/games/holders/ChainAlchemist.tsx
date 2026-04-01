import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ELEMENTS = [
  { icon: '🔥', name: 'Fire' }, { icon: '💧', name: 'Water' },
  { icon: '🌍', name: 'Earth' }, { icon: '💨', name: 'Air' },
];
const RECIPES: Record<string, { result: string; value: number }> = {
  'Fire+Water': { result: '♨️ Steam', value: 3 },
  'Fire+Earth': { result: '🌋 Lava', value: 5 },
  'Fire+Air': { result: '⚡ Lightning', value: 4 },
  'Water+Earth': { result: '🌿 Life', value: 6 },
  'Water+Air': { result: '❄️ Ice', value: 4 },
  'Earth+Air': { result: '🏔️ Mountain', value: 5 },
};

const ChainAlchemist = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Chain Alchemist" });
  const [selected, setSelected] = useState<number[]>([]);
  const [discoveries, setDiscoveries] = useState<string[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [attempts, setAttempts] = useState(10);
  const [log, setLog] = useState<string[]>([]);

  const selectElement = useCallback((idx: number) => {
    if (attempts <= 0) return;
    if (selected.length === 1 && selected[0] === idx) return;
    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setAttempts(a => a - 1);
      const names = newSelected.map(i => ELEMENTS[i].name).sort();
      const key = names.join('+');
      const recipe = RECIPES[key];

      if (recipe && !discoveries.includes(key)) {
        const bonus = Math.floor(recipe.value * (1 + totalBulls * 0.1));
        setDiscoveries(d => [...d, key]);
        setTotalValue(v => v + bonus);
        setLog(prev => [`✨ Discovered ${recipe.result}! +${bonus} 🔑`, ...prev].slice(0, 8));
      } else if (recipe) {
        setLog(prev => [`🔄 Already discovered ${recipe.result}`, ...prev].slice(0, 8));
      } else {
        setLog(prev => [`💨 ${ELEMENTS[newSelected[0]].icon}+${ELEMENTS[newSelected[1]].icon} = Nothing...`, ...prev].slice(0, 8));
      }
      setTimeout(() => setSelected([]), 300);
    }
  }, [selected, attempts, discoveries, totalBulls]);

  const claimRewards = useCallback(async () => {
    if (totalValue > 0) {
      await awardKeys(totalValue);
      setLog(prev => [`🏆 Claimed ${totalValue} 🔑!`, ...prev]);
    }
    setSelected([]);
    setDiscoveries([]);
    setTotalValue(0);
    setAttempts(10);
    setLog(['🧪 New experiment begins...']);
  }, [totalValue, awardKeys]);

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Chain Alchemist...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🧪 Chain Alchemist</h1>
        </div>
        <div className="flex gap-4 text-sm text-foreground justify-center">
          <span>🧪 Attempts: {attempts}</span><span>💎 Value: {totalValue}</span><span>📖 Found: {discoveries.length}/6</span>
        </div>
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Combine Elements</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            {ELEMENTS.map((e, i) => (
              <Button key={i} variant={selected.includes(i) ? "default" : "outline"} className="text-2xl h-16" onClick={() => selectElement(i)} disabled={attempts <= 0}>
                {e.icon}
              </Button>
            ))}
          </CardContent>
        </Card>
        {attempts <= 0 && <Button onClick={claimRewards} className="w-full bg-primary">🏆 Claim {totalValue} 🔑 & Reset</Button>}
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-1">
            {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChainAlchemist;
