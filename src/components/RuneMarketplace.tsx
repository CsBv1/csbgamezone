import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star } from "lucide-react";

const STARSIGN_RUNES = [
  { id: 'aries', name: 'Aries Rune', symbol: '♈', cost: 5000 },
  { id: 'taurus', name: 'Taurus Rune', symbol: '♉', cost: 5000 },
  { id: 'gemini', name: 'Gemini Rune', symbol: '♊', cost: 5000 },
  { id: 'cancer', name: 'Cancer Rune', symbol: '♋', cost: 5000 },
  { id: 'leo', name: 'Leo Rune', symbol: '♌', cost: 5000 },
  { id: 'virgo', name: 'Virgo Rune', symbol: '♍', cost: 5000 },
  { id: 'libra', name: 'Libra Rune', symbol: '♎', cost: 5000 },
  { id: 'scorpio', name: 'Scorpio Rune', symbol: '♏', cost: 5000 },
  { id: 'sagittarius', name: 'Sagittarius Rune', symbol: '♐', cost: 5000 },
  { id: 'capricorn', name: 'Capricorn Rune', symbol: '♑', cost: 5000 },
  { id: 'aquarius', name: 'Aquarius Rune', symbol: '♒', cost: 5000 },
  { id: 'pisces', name: 'Pisces Rune', symbol: '♓', cost: 5000 },
];

export const RuneMarketplace = () => {
  const [ownedRunes, setOwnedRunes] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [runesResult, creditsResult] = await Promise.all([
      supabase.from('user_runes' as any).select('*').eq('user_id', user.id),
      supabase.from('user_credits' as any).select('balance').eq('user_id', user.id).single()
    ]);

    setOwnedRunes((runesResult.data as any[]) || []);
    setCredits((creditsResult.data as any)?.balance || 0);
  };

  const buyRune = async (rune: typeof STARSIGN_RUNES[0]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      if (credits < rune.cost) {
        toast.error(`Need ${rune.cost.toLocaleString()} credits!`);
        return;
      }

      await supabase.from('user_credits' as any).update({ balance: credits - rune.cost }).eq('user_id', user.id);
      await supabase.from('user_runes' as any).insert({
        user_id: user.id, rune_id: rune.id, rune_name: rune.name, rune_symbol: rune.symbol, credit_cost: rune.cost
      });

      toast.success(`${rune.symbol} ${rune.name} acquired!`);
      fetchData();
    } catch (e) { toast.error("Failed to purchase"); }
    finally { setLoading(false); }
  };

  const equipRune = async (runeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_runes' as any).update({ active: false }).eq('user_id', user.id);
    await supabase.from('user_runes' as any).update({ active: true }).eq('user_id', user.id).eq('rune_id', runeId);
    toast.success("Rune equipped!");
    fetchData();
  };

  const unequipRune = async (runeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_runes' as any).update({ active: false }).eq('user_id', user.id).eq('rune_id', runeId);
    toast.success("Rune unequipped");
    fetchData();
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-2 border-purple-500/30">
      <div className="flex items-center gap-3 mb-4">
        <Star className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-purple-300">✨ Starsign Runes Marketplace</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        12 Zodiac Runes • 100K Credits each • Collect & equip on leaderboard!
      </p>
      <p className="text-sm text-purple-300 mb-4">💰 Your Credits: {credits.toLocaleString()}</p>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {STARSIGN_RUNES.map(rune => {
          const owned = ownedRunes.find((o: any) => o.rune_id === rune.id);
          return (
            <div key={rune.id} className={`p-3 rounded-lg border-2 text-center transition-all ${
              owned?.active ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20' :
              owned ? 'border-purple-500/30 bg-purple-500/10' : 'border-border/50 hover:border-purple-500/30'
            }`}>
              <div className="text-3xl mb-1">{rune.symbol}</div>
              <p className="text-xs font-bold truncate">{rune.name}</p>
              {owned ? (
                <Button size="sm" variant={owned.active ? "default" : "outline"} className="w-full mt-2 text-xs"
                  onClick={() => owned.active ? unequipRune(rune.id) : equipRune(rune.id)}>
                  {owned.active ? '✅ Active' : 'Equip'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full mt-2 text-xs" disabled={credits < rune.cost || loading}
                  onClick={() => buyRune(rune)}>
                  100K 💰
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
