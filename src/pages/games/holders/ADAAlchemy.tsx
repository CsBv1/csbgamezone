import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Beaker, Sparkles } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Ingredient { name: string; emoji: string; power: number }

const allIngredients: Ingredient[] = [
  { name: 'Moon Dust', emoji: '🌙', power: 10 },
  { name: 'Bull Tear', emoji: '💧', power: 15 },
  { name: 'Fire Shard', emoji: '🔥', power: 20 },
  { name: 'Frost Crystal', emoji: '❄️', power: 12 },
  { name: 'Shadow Essence', emoji: '🌑', power: 18 },
  { name: 'Star Fragment', emoji: '⭐', power: 25 },
  { name: 'Thunder Root', emoji: '⚡', power: 22 },
  { name: 'Void Dust', emoji: '🕳️', power: 30 },
];

const BullAlchemy = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "ADA Alchemy" });
  const [phase, setPhase] = useState<'lab' | 'brewing' | 'result'>('lab');
  const [available, setAvailable] = useState<Ingredient[]>([]);
  const [cauldron, setCauldron] = useState<Ingredient[]>([]);
  const [potionsMade, setPotionsMade] = useState(0);
  const [totalPower, setTotalPower] = useState(0);
  const [round, setRound] = useState(1);
  const entryCost = 200;
  const maxRounds = 5;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setRound(1);
    setPotionsMade(0);
    setTotalPower(0);
    setCauldron([]);
    dealIngredients();
    setPhase('brewing');
  };

  const dealIngredients = () => {
    const count = 4 + Math.min(Math.floor(bullsOwned / 5), 2);
    const shuffled = [...allIngredients].sort(() => Math.random() - 0.5);
    setAvailable(shuffled.slice(0, count));
    setCauldron([]);
  };

  const addToCauldron = (ing: Ingredient) => {
    if (cauldron.length >= 3) return;
    setCauldron(prev => [...prev, ing]);
    setAvailable(prev => prev.filter(i => i !== ing));
  };

  const brew = () => {
    if (cauldron.length < 2) { toast.error('Need at least 2 ingredients!'); return; }
    
    const power = cauldron.reduce((sum, i) => sum + i.power, 0);
    const synergy = cauldron.length === 3 ? 1.5 : 1.0;
    const luck = Math.random() > 0.3 ? 1.0 : 0.5;
    const finalPower = Math.floor(power * synergy * luck);
    
    setTotalPower(prev => prev + finalPower);
    setPotionsMade(prev => prev + 1);
    toast.success(`🧪 Brewed potion with ${finalPower} power!`);

    if (round >= maxRounds) {
      finishBrewing(totalPower + finalPower);
    } else {
      setRound(prev => prev + 1);
      dealIngredients();
    }
  };

  const finishBrewing = async (power: number) => {
    const keys = power >= 200 ? 5 : power >= 120 ? 3 : power >= 60 ? 2 : power > 0 ? 1 : 0;
    if (keys > 0) await awardKeys(keys);
    setPhase('result');
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">⚗️ ADA Alchemy</h1>
          <p className="text-muted-foreground">Combine ingredients to brew powerful potions!</p>
        </div>

        {phase === 'lab' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • {maxRounds} brewing rounds</p>
            <Button onClick={start} disabled={isLoading} size="lg"><Beaker className="w-5 h-5 mr-2" /> Enter Lab</Button>
          </div>
        )}

        {phase === 'brewing' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Round {round}/{maxRounds}</span>
              <span>🧪 Potions: {potionsMade}</span>
              <span>⚡ Total Power: {totalPower}</span>
            </div>
            
            <Card className="p-4 bg-primary/10">
              <h3 className="font-bold mb-2">🧪 Cauldron ({cauldron.length}/3):</h3>
              <div className="flex gap-2 min-h-[60px]">
                {cauldron.map((ing, i) => (
                  <div key={i} className="bg-primary/20 rounded-lg p-3 text-center">
                    <div className="text-2xl">{ing.emoji}</div>
                    <div className="text-xs">{ing.name}</div>
                    <div className="text-xs font-bold">⚡{ing.power}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-2">
              {available.map((ing, i) => (
                <Button key={i} onClick={() => addToCauldron(ing)} className="h-20 flex-col" disabled={cauldron.length >= 3}>
                  <span className="text-2xl">{ing.emoji}</span>
                  <span className="text-xs">{ing.name}</span>
                  <span className="text-xs">⚡{ing.power}</span>
                </Button>
              ))}
            </div>

            <Button onClick={brew} disabled={cauldron.length < 2} className="w-full" size="lg">
              <Sparkles className="w-5 h-5 mr-2" /> Brew Potion!
            </Button>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{totalPower >= 200 ? '🏆 Grand Alchemist!' : totalPower >= 120 ? '⚗️ Expert Brewer' : '🧪 Apprentice'}</p>
            <p>Total Power: {totalPower} • Potions: {potionsMade}</p>
            <Button onClick={() => setPhase('lab')}>Brew Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullAlchemy;
