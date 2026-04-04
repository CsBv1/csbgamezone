import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gem, ArrowLeft, Pickaxe, Zap, TrendingUp } from 'lucide-react';

interface Mine { id: number; name: string; depth: number; maxDepth: number; diamondsPerTick: number; upgradeCost: number; level: number; }

const DiamondMines = () => {
  const navigate = useNavigate();
  const [diamonds, setDiamonds] = useState(0);
  const [totalMined, setTotalMined] = useState(0);
  const [mines, setMines] = useState<Mine[]>([
    { id: 1, name: 'Crystal Cavern', depth: 0, maxDepth: 100, diamondsPerTick: 5, upgradeCost: 20, level: 1 },
    { id: 2, name: 'Deep Shaft', depth: 0, maxDepth: 150, diamondsPerTick: 0, upgradeCost: 100, level: 0 },
    { id: 3, name: 'Ancient Tunnel', depth: 0, maxDepth: 250, diamondsPerTick: 0, upgradeCost: 500, level: 0 },
    { id: 4, name: 'Volcanic Core', depth: 0, maxDepth: 500, diamondsPerTick: 0, upgradeCost: 2000, level: 0 },
  ]);
  const [drillPower, setDrillPower] = useState(1);
  const [drillUpgradeCost, setDrillUpgradeCost] = useState(50);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(0);
  const minesRef = useRef(mines);
  const drillRef = useRef(drillPower);

  // Keep refs in sync
  useEffect(() => { minesRef.current = mines; }, [mines]);
  useEffect(() => { drillRef.current = drillPower; }, [drillPower]);

  // Load initial diamond balance
  useEffect(() => {
    const loadBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_diamonds').select('balance').eq('user_id', user.id).single();
      if (data) setDiamonds((data as any).balance || 0);
    };
    loadBalance();
  }, []);

  // Mining tick - every 500ms for fast output
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const currentMines = minesRef.current;
      const drill = drillRef.current;

      setMines(prev => prev.map(mine => {
        if (mine.level === 0) return mine;
        return { ...mine, depth: Math.min(mine.depth + 1, mine.maxDepth) };
      }));

      const totalPerTick = currentMines.reduce((sum, m) => sum + (m.level > 0 ? m.diamondsPerTick * drill : 0), 0);
      if (totalPerTick > 0) {
        setDiamonds(d => d + totalPerTick);
        setTotalMined(t => t + totalPerTick);
        pendingRef.current += totalPerTick;
      }
    }, 500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const saveDiamonds = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_diamonds').select('balance, total_earned').eq('user_id', user.id).single();
      if (data) {
        const newBalance = ((data as any).balance || 0) + amount;
        const newTotal = ((data as any).total_earned || 0) + amount;
        await supabase.from('user_diamonds').update({
          balance: newBalance,
          total_earned: newTotal,
        }).eq('user_id', user.id);
      }
      await supabase.from('game_results').insert({
        user_id: user.id,
        game_name: 'Diamond Mines',
        result: 'win',
        diamonds_won: amount,
      });
    } catch (e) { console.error(e); }
  }, []);

  // Auto-save every 10s
  useEffect(() => {
    saveRef.current = setInterval(() => {
      if (pendingRef.current > 0) {
        saveDiamonds(pendingRef.current);
        pendingRef.current = 0;
      }
    }, 10000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [saveDiamonds]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current > 0) {
        saveDiamonds(pendingRef.current);
        pendingRef.current = 0;
      }
    };
  }, [saveDiamonds]);

  const handleExit = async () => {
    if (pendingRef.current > 0) {
      await saveDiamonds(pendingRef.current);
      pendingRef.current = 0;
      toast.success(`💎 Saved ${totalMined.toLocaleString()} diamonds to your balance!`);
    }
    navigate('/dashboard');
  };

  const upgradeMine = (mineId: number) => {
    setMines(prev => prev.map(mine => {
      if (mine.id !== mineId) return mine;
      const cost = mine.upgradeCost;
      if (diamonds < cost) { toast.error('Not enough diamonds!'); return mine; }
      setDiamonds(d => d - cost);
      return {
        ...mine,
        level: mine.level + 1,
        diamondsPerTick: mine.level === 0 ? mine.id * 5 : mine.diamondsPerTick + mine.id * 3,
        upgradeCost: Math.floor(cost * 1.5),
        maxDepth: mine.maxDepth + 50,
      };
    }));
  };

  const upgradeDrill = () => {
    if (diamonds < drillUpgradeCost) { toast.error('Not enough diamonds!'); return; }
    setDiamonds(d => d - drillUpgradeCost);
    setDrillPower(p => p + 1);
    setDrillUpgradeCost(c => Math.floor(c * 1.5));
  };

  const totalPerTick = mines.reduce((sum, m) => sum + (m.level > 0 ? m.diamondsPerTick * drillPower : 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d2137] to-[#1a0a2e] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">⛏️ Diamond Mines</h1>
        </div>

        {/* Stats */}
        <Card className="p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/40 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-cyan-300">Diamonds</p>
              <p className="text-3xl font-bold text-white">{diamonds.toLocaleString()} 💎</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-300">Per Second</p>
              <p className="text-xl font-bold text-yellow-400">+{(totalPerTick * 2).toLocaleString()} 💎/s</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-cyan-400">Session: {totalMined.toLocaleString()} 💎 | Drill Power: x{drillPower}</div>
        </Card>

        {/* Drill upgrade */}
        <Card className="p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm font-bold text-white">Drill Power x{drillPower}</p>
                <p className="text-xs text-yellow-300">Multiplies all mine output</p>
              </div>
            </div>
            <Button size="sm" onClick={upgradeDrill} disabled={diamonds < drillUpgradeCost}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
              Upgrade ({drillUpgradeCost.toLocaleString()} 💎)
            </Button>
          </div>
        </Card>

        {/* Mines */}
        <div className="space-y-3">
          {mines.map(mine => (
            <Card key={mine.id} className={`p-4 border-2 transition-all ${mine.level > 0 ? 'bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30' : 'bg-muted/10 border-muted/20 opacity-60'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pickaxe className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="font-bold text-white">{mine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mine.level === 0 ? 'Locked' : `Level ${mine.level} • +${(mine.diamondsPerTick * drillPower * 2).toLocaleString()} 💎/s`}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => upgradeMine(mine.id)} disabled={diamonds < mine.upgradeCost}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
                  {mine.level === 0 ? 'Unlock' : 'Upgrade'} ({mine.upgradeCost.toLocaleString()} 💎)
                </Button>
              </div>
              {mine.level > 0 && (
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${(mine.depth / mine.maxDepth) * 100}%` }} />
                </div>
              )}
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-cyan-400/50 mt-6">Diamonds auto-save every 10s & when you leave ⛏️</p>
      </div>
    </div>
  );
};

export default DiamondMines;
