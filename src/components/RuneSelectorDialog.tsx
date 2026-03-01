import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star } from "lucide-react";

const STARSIGN_RUNES = [
  { id: 'aries', name: 'Aries Rune', symbol: '♈', cost: 100000 },
  { id: 'taurus', name: 'Taurus Rune', symbol: '♉', cost: 100000 },
  { id: 'gemini', name: 'Gemini Rune', symbol: '♊', cost: 100000 },
  { id: 'cancer', name: 'Cancer Rune', symbol: '♋', cost: 100000 },
  { id: 'leo', name: 'Leo Rune', symbol: '♌', cost: 100000 },
  { id: 'virgo', name: 'Virgo Rune', symbol: '♍', cost: 100000 },
  { id: 'libra', name: 'Libra Rune', symbol: '♎', cost: 100000 },
  { id: 'scorpio', name: 'Scorpio Rune', symbol: '♏', cost: 100000 },
  { id: 'sagittarius', name: 'Sagittarius Rune', symbol: '♐', cost: 100000 },
  { id: 'capricorn', name: 'Capricorn Rune', symbol: '♑', cost: 100000 },
  { id: 'aquarius', name: 'Aquarius Rune', symbol: '♒', cost: 100000 },
  { id: 'pisces', name: 'Pisces Rune', symbol: '♓', cost: 100000 },
];

export const RuneSelectorDialog = () => {
  const [ownedRunes, setOwnedRunes] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
          <Star className="w-4 h-4 mr-1" /> Starsign Runes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">✨ Starsign Runes</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">💰 Credits: {credits.toLocaleString()} • Cost: 100K each</p>
        <div className="grid grid-cols-2 gap-3">
          {STARSIGN_RUNES.map(rune => {
            const owned = ownedRunes.find((o: any) => o.rune_id === rune.id);
            return (
              <div key={rune.id} className={`p-3 rounded-lg border-2 text-center ${owned ? 'border-purple-500/50 bg-purple-500/10' : 'border-border'}`}>
                <div className="text-3xl mb-1">{rune.symbol}</div>
                <p className="text-sm font-bold">{rune.name}</p>
                {owned ? (
                  <Button size="sm" variant={owned.active ? "default" : "outline"} className="w-full mt-2" 
                    onClick={() => owned.active ? unequipRune(rune.id) : equipRune(rune.id)}>
                    {owned.active ? '✅ Equipped' : 'Equip'}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="w-full mt-2" disabled={credits < rune.cost || loading}
                    onClick={() => buyRune(rune)}>
                    {rune.cost.toLocaleString()} 💰
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
