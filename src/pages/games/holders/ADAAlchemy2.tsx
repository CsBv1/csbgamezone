import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Potion {
  name: string;
  icon: string;
  recipe: string[];
  value: number;
  crafted: boolean;
}

const ELEMENTS = ["🔥 Fire", "💧 Water", "🌿 Earth", "⚡ Lightning", "❄️ Ice", "☀️ Light"];

const POTIONS: Potion[] = [
  { name: "Healing Elixir", icon: "💚", recipe: ["💧 Water", "🌿 Earth"], value: 30, crafted: false },
  { name: "Fire Storm", icon: "🌋", recipe: ["🔥 Fire", "⚡ Lightning"], value: 50, crafted: false },
  { name: "Frost Shield", icon: "🛡️", recipe: ["❄️ Ice", "💧 Water"], value: 40, crafted: false },
  { name: "Solar Beam", icon: "☀️", recipe: ["☀️ Light", "🔥 Fire"], value: 60, crafted: false },
  { name: "Thunder Root", icon: "⚡", recipe: ["⚡ Lightning", "🌿 Earth"], value: 55, crafted: false },
  { name: "Diamond Dust", icon: "💎", recipe: ["❄️ Ice", "☀️ Light"], value: 80, crafted: false },
  { name: "Void Essence", icon: "🌑", recipe: ["🔥 Fire", "❄️ Ice", "⚡ Lightning"], value: 120, crafted: false },
];

const ADABrewer = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "ADA Brewer" });
  const [inventory, setInventory] = useState<string[]>([]);
  const [potions, setPotions] = useState<Potion[]>(POTIONS);
  const [score, setScore] = useState(0);
  const [gathers, setGathers] = useState(0);
  const [log, setLog] = useState<string[]>(["⚗️ Gather elements and brew potions!"]);
  const maxGathers = 15;

  const gather = () => {
    if (gathers >= maxGathers) return;
    const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    setInventory(prev => [...prev, element]);
    setGathers(prev => prev + 1);
    setLog(prev => [`Gathered ${element}`, ...prev.slice(0, 8)]);
  };

  const brew = useCallback((potionIndex: number) => {
    const potion = potions[potionIndex];
    if (potion.crafted) return;
    
    // Check if inventory has all needed elements
    const tempInv = [...inventory];
    const hasAll = potion.recipe.every(needed => {
      const idx = tempInv.indexOf(needed);
      if (idx === -1) return false;
      tempInv.splice(idx, 1);
      return true;
    });

    if (!hasAll) {
      setLog(prev => [`❌ Missing ingredients for ${potion.name}!`, ...prev.slice(0, 8)]);
      return;
    }

    setInventory(tempInv);
    setPotions(prev => prev.map((p, i) => i === potionIndex ? { ...p, crafted: true } : p));
    setScore(prev => prev + potion.value);
    setLog(prev => [`✅ Brewed ${potion.icon} ${potion.name}! +${potion.value} pts`, ...prev.slice(0, 8)]);

    const craftedCount = potions.filter(p => p.crafted).length + 1;
    if (craftedCount >= 5) awardKeys(Math.ceil(craftedCount / 2));
  }, [inventory, potions, awardKeys]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-foreground">Loading...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">⚗️ ADA Brewer</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Dashboard</Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Score</p><p className="text-lg font-bold">⭐ {score}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Gathers</p><p className="text-lg font-bold">{gathers}/{maxGathers}</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Brewed</p><p className="text-lg font-bold">{potions.filter(p => p.crafted).length}/{potions.length}</p></Card>
        </div>

        <Button className="w-full" onClick={gather} disabled={gathers >= maxGathers}>
          🌿 Gather Element ({gathers}/{maxGathers})
        </Button>

        <Card className="p-3">
          <p className="text-xs font-bold text-foreground mb-2">Inventory</p>
          <div className="flex flex-wrap gap-1">
            {inventory.length === 0 ? <p className="text-xs text-muted-foreground">Empty — gather elements!</p> : 
              inventory.map((e, i) => <span key={i} className="px-2 py-1 bg-primary/10 rounded text-xs">{e}</span>)}
          </div>
        </Card>

        <div className="space-y-2">
          {potions.map((p, i) => (
            <Card key={p.name} className={`p-3 flex items-center justify-between ${p.crafted ? 'bg-green-500/10 border-green-500/30' : ''}`}>
              <div>
                <p className="font-bold text-sm text-foreground">{p.icon} {p.name} ({p.value}pts)</p>
                <p className="text-xs text-muted-foreground">Needs: {p.recipe.join(" + ")}</p>
              </div>
              <Button size="sm" onClick={() => brew(i)} disabled={p.crafted}>
                {p.crafted ? "✅" : "Brew"}
              </Button>
            </Card>
          ))}
        </div>

        <Card className="p-3">
          <p className="text-xs font-bold text-foreground mb-1">Brew Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {log.map((l, i) => <p key={i} className="text-xs text-muted-foreground">{l}</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ADABrewer;
