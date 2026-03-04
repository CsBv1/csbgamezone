import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords, Shield, Heart } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const arenaNames = ['Bronze Pit', 'Silver Colosseum', 'Gold Arena', 'Platinum Ring', 'Diamond Sanctum', 'Legendary Throne'];

const BullGladiator = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Gladiator" });
  const [phase, setPhase] = useState<'gates' | 'fight' | 'rest' | 'result'>('gates');
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [rage, setRage] = useState(0);
  const [arena, setArena] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [enemyMaxHp, setEnemyMaxHp] = useState(0);
  const [enemyName, setEnemyName] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 300;

  const enemies = [
    ['Pit Fighter', 'Arena Guard', 'Sand Stalker'],
    ['Silver Knight', 'War Hound', 'Spear Master'],
    ['Gold Champion', 'Dual Blade', 'Heavy Shield'],
    ['Platinum Beast', 'Chain Lord', 'Dark Mage'],
    ['Diamond Golem', 'Storm Bull', 'Void Walker'],
    ['The Emperor', 'Eternal Bull', 'Chaos Lord'],
  ];

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    const startHp = 120 + bullsOwned * 5;
    setMaxHp(startHp);
    setHp(startHp);
    setRage(0);
    setArena(0);
    setLog([]);
    spawnEnemy(0);
    setPhase('fight');
  };

  const spawnEnemy = (a: number) => {
    const names = enemies[Math.min(a, enemies.length - 1)];
    const name = names[Math.floor(Math.random() * names.length)];
    const eHp = 40 + a * 25;
    setEnemyName(name);
    setEnemyHp(eHp);
    setEnemyMaxHp(eHp);
  };

  const fight = (move: 'slash' | 'block' | 'fury') => {
    let dmg = 0, taken = 0;
    const enemyPower = 8 + arena * 5;

    switch (move) {
      case 'slash':
        dmg = 15 + Math.floor(Math.random() * 10) + Math.floor(rage / 10);
        taken = Math.floor(Math.random() * enemyPower);
        setRage(prev => Math.min(100, prev + 10));
        break;
      case 'block':
        dmg = 5;
        taken = Math.max(0, Math.floor(Math.random() * enemyPower) - 10);
        setRage(prev => Math.min(100, prev + 5));
        break;
      case 'fury':
        if (rage < 50) { toast.error('Need 50+ rage!'); return; }
        dmg = 40 + Math.floor(rage / 2);
        taken = Math.floor(Math.random() * enemyPower) + 5;
        setRage(0);
        break;
    }

    const newEHp = Math.max(0, enemyHp - dmg);
    const newHp = Math.max(0, hp - taken);
    setEnemyHp(newEHp);
    setHp(newHp);
    setLog(prev => [...prev, `${arenaNames[arena]}: ${move} dealt:${dmg} took:${taken}`]);

    if (newHp <= 0) finishGladiator();
    else if (newEHp <= 0) {
      if (arena >= 5) finishGladiator();
      else { setArena(prev => prev + 1); setPhase('rest'); }
    }
  };

  const rest = (choice: 'heal' | 'rage' | 'skip') => {
    if (choice === 'heal') setHp(prev => Math.min(maxHp, prev + 30));
    else if (choice === 'rage') setRage(prev => Math.min(100, prev + 40));
    spawnEnemy(arena);
    setPhase('fight');
  };

  const finishGladiator = async () => {
    const keys = arena >= 5 && hp > 0 ? 6 : arena >= 4 ? 4 : arena >= 2 ? 2 : arena >= 1 ? 1 : 0;
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">⚔️ Bull Gladiator</h1>
          <p className="text-muted-foreground">Fight through 6 arenas to become champion!</p>
        </div>

        {phase === 'gates' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • 6 arena tiers</p>
            <Button onClick={start} disabled={isLoading} size="lg"><Swords className="w-5 h-5 mr-2" /> Enter Arena</Button>
          </div>
        )}

        {phase === 'fight' && (
          <div className="space-y-4">
            <div className="text-center font-bold text-sm text-muted-foreground">{arenaNames[arena]}</div>
            <div className="flex justify-between text-lg font-bold">
              <span>❤️ {hp}/{maxHp}</span>
              <span>🔥 Rage: {rage}</span>
              <span>👹 {enemyName}: {enemyHp}/{enemyMaxHp}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => fight('slash')} className="h-16 flex-col"><Swords className="w-5 h-5 mb-1" />Slash<span className="text-xs">+10 rage</span></Button>
              <Button onClick={() => fight('block')} className="h-16 flex-col"><Shield className="w-5 h-5 mb-1" />Block<span className="text-xs">Reduce damage</span></Button>
              <Button onClick={() => fight('fury')} disabled={rage < 50} className="h-16 flex-col">🔥 Fury<span className="text-xs">50+ rage, big hit</span></Button>
            </div>
            <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto space-y-1">{log.slice(-4).map((l, i) => <div key={i}>{l}</div>)}</div>
          </div>
        )}

        {phase === 'rest' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold">⚔️ Victory! Next: {arenaNames[arena]}</p>
            <p>HP: {hp}/{maxHp} • Rage: {rage}</p>
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => rest('heal')}><Heart className="w-4 h-4 mr-1" /> Heal +30</Button>
              <Button onClick={() => rest('rage')}>🔥 +40 Rage</Button>
              <Button onClick={() => rest('skip')} variant="outline">Skip Rest</Button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{arena >= 5 && hp > 0 ? '👑 CHAMPION!' : hp <= 0 ? '💀 Fallen!' : `⚔️ Arena ${arena + 1}`}</p>
            <p className="text-muted-foreground">Reached: {arenaNames[Math.min(arena, 5)]}</p>
            <Button onClick={() => setPhase('gates')}>Fight Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullGladiator;
