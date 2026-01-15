import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hammer, Flame, Gem } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

interface Item {
  id: string;
  name: string;
  emoji: string;
  tier: number;
  value: number;
}

const RECIPES: { [key: string]: { result: Item; ingredients: string[] } } = {
  "ore+ore": { result: { id: "ingot", name: "Steel Ingot", emoji: "🔩", tier: 1, value: 20 }, ingredients: ["ore", "ore"] },
  "ingot+ingot": { result: { id: "plate", name: "Steel Plate", emoji: "🛡️", tier: 2, value: 50 }, ingredients: ["ingot", "ingot"] },
  "plate+gem": { result: { id: "sword", name: "Bull Sword", emoji: "⚔️", tier: 3, value: 150 }, ingredients: ["plate", "gem"] },
  "plate+plate": { result: { id: "armor", name: "Bull Armor", emoji: "🎖️", tier: 3, value: 180 }, ingredients: ["plate", "plate"] },
  "sword+gem": { result: { id: "legendary", name: "Legendary Blade", emoji: "🗡️", tier: 4, value: 400 }, ingredients: ["sword", "gem"] },
  "armor+gem": { result: { id: "crown", name: "Bull Crown", emoji: "👑", tier: 4, value: 500 }, ingredients: ["armor", "gem"] },
};

export default function BullBlacksmith() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Blacksmith" 
  });
  
  const [gold, setGold] = useState(100);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [forging, setForging] = useState(false);
  const [turn, setTurn] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  
  const maxTurns = 15;
  const goalValue = 800;

  const buyOre = () => {
    if (gold < 10) {
      audioManager.playSFX('error');
      return;
    }
    audioManager.playSFX('coin');
    setGold(g => g - 10);
    setInventory(inv => [...inv, { id: "ore", name: "Iron Ore", emoji: "🪨", tier: 0, value: 5 }]);
  };

  const buyGem = () => {
    if (gold < 30) {
      audioManager.playSFX('error');
      return;
    }
    audioManager.playSFX('coin');
    setGold(g => g - 30);
    setInventory(inv => [...inv, { id: "gem", name: "Magic Gem", emoji: "💎", tier: 1, value: 25 }]);
  };

  const toggleSelect = (index: number) => {
    if (selected.includes(index)) {
      setSelected(selected.filter(i => i !== index));
    } else if (selected.length < 2) {
      audioManager.playSFX('select');
      setSelected([...selected, index]);
    }
  };

  const forge = () => {
    if (selected.length !== 2) return;
    
    const item1 = inventory[selected[0]];
    const item2 = inventory[selected[1]];
    const key = [item1.id, item2.id].sort().join("+");
    
    const recipe = RECIPES[key];
    if (!recipe) {
      audioManager.playSFX('error');
      setSelected([]);
      return;
    }
    
    setForging(true);
    audioManager.playSFX('attack');
    
    setTimeout(() => {
      // Remove used items and add result
      const newInv = inventory.filter((_, i) => !selected.includes(i));
      newInv.push(recipe.result);
      setInventory(newInv);
      setSelected([]);
      setForging(false);
      audioManager.playSFX('levelUp');
      
      const newTurn = turn + 1;
      setTurn(newTurn);
      
      if (newTurn > maxTurns) {
        endGame();
      }
    }, 800);
  };

  const sellItem = (index: number) => {
    const item = inventory[index];
    audioManager.playSFX('collect');
    setGold(g => g + item.value);
    setInventory(inv => inv.filter((_, i) => i !== index));
  };

  const endGame = async () => {
    setGameOver(true);
    const totalValue = inventory.reduce((sum, item) => sum + item.value, 0) + gold;
    
    if (totalValue >= goalValue) {
      audioManager.playSFX('jackpot');
      const keys = 1 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    } else {
      audioManager.playSFX('lose');
    }
  };

  const resetGame = () => {
    setGold(100);
    setInventory([]);
    setSelected([]);
    setForging(false);
    setTurn(1);
    setGameOver(false);
    setKeysEarned(0);
  };

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0) + gold;

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-lg mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Hammer className="w-8 h-8 text-orange-500" />
            Bull Blacksmith
          </h1>
          <p className="text-muted-foreground">Forge legendary items! Reach {goalValue}g total value.</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{totalValue >= goalValue ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {totalValue >= goalValue ? 'Master Blacksmith!' : 'Forge Failed!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">Final Value: {totalValue}g / {goalValue}g</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Forge Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex justify-between items-center mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Gold</p>
                <p className="text-xl font-bold text-yellow-400">{gold}g</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Turn</p>
                <p className="text-xl font-bold">{turn}/{maxTurns}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="text-xl font-bold text-green-400">{totalValue}g</p>
              </div>
            </div>

            {/* Shop */}
            <div className="flex gap-2 mb-4">
              <Button onClick={buyOre} disabled={gold < 10} className="flex-1" variant="outline">
                🪨 Ore (10g)
              </Button>
              <Button onClick={buyGem} disabled={gold < 30} className="flex-1" variant="outline">
                💎 Gem (30g)
              </Button>
            </div>

            {/* Inventory */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Inventory (tap 2 to forge, long-tap to sell)</p>
              <div className="grid grid-cols-5 gap-2 min-h-[80px] p-2 bg-muted/20 rounded-lg">
                {inventory.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    onDoubleClick={() => sellItem(i)}
                    className={`aspect-square text-2xl flex items-center justify-center rounded-lg transition-all
                      ${selected.includes(i) ? 'ring-2 ring-primary bg-primary/20' : 'bg-muted/40 hover:bg-muted/60'}
                    `}
                    title={`${item.name} (${item.value}g)`}
                  >
                    {item.emoji}
                  </button>
                ))}
                {inventory.length === 0 && (
                  <p className="col-span-5 text-center text-muted-foreground py-4">Buy materials to start!</p>
                )}
              </div>
            </div>

            {/* Forge */}
            <Button 
              onClick={forge} 
              disabled={selected.length !== 2 || forging}
              className="w-full"
              size="lg"
            >
              {forging ? (
                <span className="flex items-center gap-2">
                  <Flame className="w-5 h-5 animate-pulse" /> Forging...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Hammer className="w-5 h-5" /> Forge Selected
                </span>
              )}
            </Button>

            {/* Recipes hint */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              <p>Recipes: 🪨+🪨→🔩 | 🔩+🔩→🛡️ | 🛡️+💎→⚔️ | ⚔️+💎→🗡️</p>
            </div>

            <Button onClick={endGame} variant="outline" className="w-full mt-2">
              End Turn {turn} / Cash Out
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
