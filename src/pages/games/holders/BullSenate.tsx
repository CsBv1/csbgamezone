import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PROPOSALS = [
  { name: 'Tax the Rich', pop: 20, wealth: -15, stability: -5 },
  { name: 'Build Roads', pop: 10, wealth: -10, stability: 15 },
  { name: 'Free Markets', pop: -5, wealth: 25, stability: 5 },
  { name: 'Military Draft', pop: -15, wealth: -5, stability: 25 },
  { name: 'Festival', pop: 25, wealth: -20, stability: -10 },
  { name: 'Trade Deal', pop: 5, wealth: 20, stability: 10 },
  { name: 'Censor Press', pop: -20, wealth: 5, stability: 20 },
  { name: 'Land Reform', pop: 15, wealth: -5, stability: -10 },
];

const BullSenate = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Senate" });
  const [phase, setPhase] = useState<'lobby' | 'session' | 'result'>('lobby');
  const [stats, setStats] = useState({ popularity: 50, wealth: 50, stability: 50 });
  const [turn, setTurn] = useState(1);
  const [choices, setChoices] = useState<typeof PROPOSALS>([]);
  const maxTurns = 10;
  const entryCost = 200;

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setStats({ popularity: 50 + bullsOwned, wealth: 50, stability: 50 });
    setTurn(1);
    generateChoices();
    setPhase('session');
  };

  const generateChoices = () => {
    const shuffled = [...PROPOSALS].sort(() => Math.random() - 0.5);
    setChoices(shuffled.slice(0, 3));
  };

  const vote = async (proposal: typeof PROPOSALS[0]) => {
    const newStats = {
      popularity: Math.max(0, Math.min(100, stats.popularity + proposal.pop)),
      wealth: Math.max(0, Math.min(100, stats.wealth + proposal.wealth)),
      stability: Math.max(0, Math.min(100, stats.stability + proposal.stability)),
    };
    setStats(newStats);

    if (newStats.popularity <= 0 || newStats.wealth <= 0 || newStats.stability <= 0) {
      setPhase('result');
      return;
    }

    if (turn >= maxTurns) {
      const avg = (newStats.popularity + newStats.wealth + newStats.stability) / 3;
      const keys = avg >= 70 ? 4 : avg >= 50 ? 3 : avg >= 30 ? 2 : 1;
      await awardKeys(keys);
      setPhase('result');
    } else {
      setTurn(prev => prev + 1);
      generateChoices();
    }
  };

  const avg = Math.floor((stats.popularity + stats.wealth + stats.stability) / 3);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🏛️ Bull Senate</h1>
          <p className="text-muted-foreground">Balance popularity, wealth & stability across {maxTurns} votes!</p>
        </div>

        {phase === 'lobby' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Keep all 3 stats above 0!</p>
            <Button onClick={start} disabled={isLoading} size="lg">Enter Senate</Button>
          </div>
        )}

        {phase === 'session' && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold flex-wrap gap-2">
              <span>Vote {turn}/{maxTurns}</span>
              <span>👥 Pop: {stats.popularity}</span>
              <span>💰 Wealth: {stats.wealth}</span>
              <span>🛡️ Stability: {stats.stability}</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {choices.map((p, i) => (
                <Button key={i} onClick={() => vote(p)} className="h-auto py-4 flex-col text-left items-start">
                  <span className="text-lg font-bold">{p.name}</span>
                  <span className="text-xs">
                    👥 {p.pop > 0 ? '+' : ''}{p.pop} • 💰 {p.wealth > 0 ? '+' : ''}{p.wealth} • 🛡️ {p.stability > 0 ? '+' : ''}{p.stability}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{stats.popularity <= 0 || stats.wealth <= 0 || stats.stability <= 0 ? '💀 Overthrown!' : `🏛️ Senate Score: ${avg}`}</p>
            <Button onClick={() => setPhase('lobby')}>Play Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullSenate;
