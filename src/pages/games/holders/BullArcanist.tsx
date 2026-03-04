import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Snowflake, Zap, Wind } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Element = 'fire' | 'ice' | 'lightning' | 'wind';
const elements: { type: Element; emoji: string; icon: any; strong: Element; weak: Element }[] = [
  { type: 'fire', emoji: '🔥', icon: Flame, strong: 'ice', weak: 'wind' },
  { type: 'ice', emoji: '❄️', icon: Snowflake, strong: 'wind', weak: 'fire' },
  { type: 'lightning', emoji: '⚡', icon: Zap, strong: 'fire', weak: 'ice' },
  { type: 'wind', emoji: '🌪️', icon: Wind, strong: 'lightning', weak: 'ice' },
];

const BullArcanist = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Arcanist" });
  const [phase, setPhase] = useState<'menu' | 'battle' | 'result'>('menu');
  const [mana, setMana] = useState(0);
  const [hp, setHp] = useState(100);
  const [bossHp, setBossHp] = useState(0);
  const [bossElement, setBossElement] = useState<Element>('fire');
  const [wave, setWave] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 250;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setHp(100 + bullsOwned * 3);
    setMana(50 + bullsOwned * 2);
    setWave(1);
    setLog([]);
    spawnBoss(1);
    setPhase('battle');
  };

  const spawnBoss = (w: number) => {
    setBossHp(40 + w * 20);
    setBossElement(elements[Math.floor(Math.random() * elements.length)].type);
  };

  const castSpell = (element: Element) => {
    if (mana < 10) { toast.error('Not enough mana!'); return; }
    setMana(prev => prev - 10);

    const el = elements.find(e => e.type === element)!;
    const isStrong = el.strong === bossElement;
    const isWeak = el.weak === bossElement;
    const baseDmg = isStrong ? 35 : isWeak ? 10 : 20;
    const dmg = baseDmg + Math.floor(Math.random() * 10);
    const bossDmg = 10 + wave * 3 + Math.floor(Math.random() * 8);

    const newBossHp = Math.max(0, bossHp - dmg);
    const newHp = Math.max(0, hp - bossDmg);
    setBossHp(newBossHp);
    setHp(newHp);

    const effectiveness = isStrong ? '💥SUPER' : isWeak ? '😬WEAK' : '⚔️NORMAL';
    setLog(prev => [...prev, `W${wave}: ${el.emoji} ${effectiveness} dealt:${dmg} took:${bossDmg}`]);

    if (newHp <= 0) { finishGame(wave - 1); }
    else if (newBossHp <= 0) {
      setMana(prev => prev + 15);
      if (wave >= 6) { finishGame(wave); }
      else { setWave(prev => prev + 1); spawnBoss(wave + 1); }
    }
  };

  const meditate = () => {
    setMana(prev => Math.min(100 + bullsOwned * 2, prev + 20));
    const bossDmg = 5 + wave * 2;
    setHp(prev => Math.max(0, prev - bossDmg));
    setLog(prev => [...prev, `W${wave}: 🧘 Meditate +20 mana, took ${bossDmg}`]);
    if (hp - bossDmg <= 0) finishGame(wave - 1);
  };

  const finishGame = async (waves: number) => {
    const keys = waves >= 6 ? 5 : waves >= 4 ? 3 : waves >= 2 ? 1 : 0;
    if (keys > 0) await awardKeys(keys);
    setPhase('result');
  };

  const bossEl = elements.find(e => e.type === bossElement);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🧙 Bull Arcanist</h1>
          <p className="text-muted-foreground">Master the elements! Exploit weaknesses to defeat 6 bosses!</p>
        </div>

        {phase === 'menu' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Defeat elemental bosses</p>
            <div className="text-sm text-muted-foreground">🔥→❄️ ❄️→🌪️ ⚡→🔥 🌪️→⚡</div>
            <Button onClick={start} disabled={isLoading} size="lg">Begin Trials</Button>
          </div>
        )}

        {phase === 'battle' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Wave {wave}/6</span>
              <span>❤️ HP: {hp}</span>
              <span>🔮 Mana: {mana}</span>
            </div>
            <Card className="p-4 text-center bg-destructive/10">
              <div className="text-4xl mb-1">{bossEl?.emoji}</div>
              <div className="font-bold">{bossElement.toUpperCase()} Boss • HP: {bossHp}</div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {elements.map(el => (
                <Button key={el.type} onClick={() => castSpell(el.type)} disabled={mana < 10} className="h-16 flex-col">
                  <el.icon className="w-5 h-5 mb-1" />{el.emoji} {el.type}<span className="text-xs">10 mana</span>
                </Button>
              ))}
            </div>
            <Button onClick={meditate} variant="outline" className="w-full">🧘 Meditate (+20 mana, take hit)</Button>
            <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto space-y-1">{log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{wave >= 6 && hp > 0 ? '🧙 Archmage!' : hp <= 0 ? '💀 Defeated!' : `⚔️ Wave ${wave}`}</p>
            <Button onClick={() => setPhase('menu')}>Try Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullArcanist;
