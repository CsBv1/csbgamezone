import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Castle, Gem, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

/**
 * Bull Kingdom — DIAMOND-ONLY idle farm.
 * Credits are NOT used or awarded anywhere in this game.
 * Players build structures that passively generate diamonds.
 */
const BullKingdom = () => {
  const navigate = useNavigate();

  const [diamonds, setDiamonds] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rarityBonus, setRarityBonus] = useState(0);

  const MAX_BUILDINGS = 30;
  const [kingdom, setKingdom] = useState({ bulls: 5, farms: 2, mines: 1, castles: 0 });
  const [stockpile, setStockpile] = useState(0); // raw diamond ore
  const [autoCollect, setAutoCollect] = useState(false);
  const stockpileRef = useRef(0);

  // ---- load user data (diamonds only) ----
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setUserId(session.user.id);

        const { data: d } = await supabase
          .from("user_diamonds" as any)
          .select("balance")
          .eq("user_id", session.user.id)
          .single();
        if (d) setDiamonds((d as any).balance ?? 0);

        const { data: nft } = await supabase
          .from("user_nft_bonuses" as any)
          .select("rarity_bonus")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (nft) setRarityBonus(Number((nft as any).rarity_bonus) || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // keep ref in sync
  useEffect(() => { stockpileRef.current = stockpile; }, [stockpile]);

  // ---- production tick (every 3s) ----
  useEffect(() => {
    if (!autoCollect) return;
    const id = setInterval(() => {
      const castleBonus = Math.pow(1.25, kingdom.castles);
      const base =
        kingdom.bulls * 3 +
        kingdom.farms * 8 +
        kingdom.mines * 15;
      const produced = Math.floor(base * castleBonus);
      setStockpile(prev => prev + produced);
    }, 3000);
    return () => clearInterval(id);
  }, [autoCollect, kingdom]);

  // ---- auto-refine stockpile → real diamonds (every 8s) ----
  useEffect(() => {
    if (!autoCollect) return;
    const id = setInterval(() => {
      const raw = stockpileRef.current;
      if (raw < 10) return;
      const refined = Math.floor(raw / 10);
      flushDiamonds(refined);
      setStockpile(prev => prev % 10);
    }, 8000);
    return () => clearInterval(id);
  }, [autoCollect, userId]);

  // ---- flush diamonds to DB ----
  const flushDiamonds = useCallback(async (amount: number) => {
    if (!userId || amount <= 0) return;
    try {
      const bonusMult = 1 + rarityBonus / 100;
      const final = Math.floor(amount * bonusMult);

      const { data: cur } = await supabase
        .from("user_diamonds" as any)
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single();
      if (!cur) return;

      const newBal = (cur as any).balance + final;
      const newTotal = (cur as any).total_earned + final;
      await supabase
        .from("user_diamonds" as any)
        .update({ balance: newBal, total_earned: newTotal })
        .eq("user_id", userId);

      setDiamonds(newBal);

      // record for season points trigger
      await supabase.from("game_results" as any).insert({
        user_id: userId,
        game_name: "Bull Kingdom",
        result: "win",
        diamonds_won: final,
        multiplier: bonusMult,
      });

      const bonusTxt = rarityBonus > 0 ? ` (+${rarityBonus}% NFT bonus)` : "";
      toast.success(`💎 Refined ${final} diamonds!${bonusTxt}`);
    } catch (e) {
      console.error(e);
    }
  }, [userId, rarityBonus]);

  // ---- manual collect ----
  const collectRewards = async () => {
    if (stockpile < 10) return;
    const refined = Math.floor(stockpile / 10);
    await flushDiamonds(refined);
    setStockpile(prev => prev % 10);
  };

  // ---- buy building (costs diamonds from stockpile — NO credits involved) ----
  const prices = { bull: 20, farm: 60, mine: 150, castle: 400 };
  const buyBuilding = (type: string) => {
    const cost = prices[type as keyof typeof prices];
    const key = type === "bull" ? "bulls" : type === "farm" ? "farms" : type === "mine" ? "mines" : "castles";
    if (stockpile < cost || kingdom[key] >= MAX_BUILDINGS || loading) return;
    setStockpile(prev => prev - cost);
    setKingdom(prev => ({ ...prev, [key]: prev[key] + 1 }));
    toast.success(`Built a new ${type}!`);
  };

  const totalPower = kingdom.bulls + kingdom.farms * 2 + kingdom.mines * 5 + kingdom.castles * 10;
  const refinedPreview = Math.floor(stockpile / 10);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-6xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🏰 Bull Kingdom</h1>
          <p className="text-muted-foreground">Diamond-only idle farm — build, produce, refine 💎</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-2xl font-bold text-accent">💎 {diamonds} (wallet)</div>
            <div className="text-2xl font-bold text-primary">⛏️ {stockpile} ore</div>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Kingdom Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 bg-primary/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Castle className="w-5 h-5" /> Kingdom Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span>🐂 Bulls:</span><span className="font-bold">{kingdom.bulls}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>🌾 Farms:</span><span className="font-bold">{kingdom.farms}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>⛏️ Mines:</span><span className="font-bold">{kingdom.mines}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between"><span>🏰 Castles:</span><span className="font-bold">{kingdom.castles}/{MAX_BUILDINGS}</span></div>
              <div className="flex justify-between border-t pt-2">
                <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Total Power:</span>
                <span className="font-bold text-primary">{totalPower}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-accent/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Gem className="w-5 h-5" /> Diamond Stockpile</h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent">⛏️ {stockpile}</div>
                <div className="text-sm text-muted-foreground mt-1">Raw diamond ore</div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Refines to <span className="font-bold text-accent">{refinedPreview} 💎</span> (10 ore = 1 diamond)
              </div>
              <Button onClick={collectRewards} className="w-full" disabled={stockpile < 10 || loading}>
                Refine → {refinedPreview} 💎
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-muted/50 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Build (costs ore)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { type: "bull", emoji: "🐂", name: "Bull" },
              { type: "farm", emoji: "🌾", name: "Farm" },
              { type: "mine", emoji: "⛏️", name: "Mine" },
              { type: "castle", emoji: "🏰", name: "Castle" },
            ] as const).map(b => {
              const key = b.type === "bull" ? "bulls" : b.type === "farm" ? "farms" : b.type === "mine" ? "mines" : "castles";
              return (
                <Button key={b.type} onClick={() => buyBuilding(b.type)}
                  disabled={stockpile < prices[b.type] || kingdom[key] >= MAX_BUILDINGS}
                  className="flex flex-col h-auto py-4">
                  <span className="text-2xl mb-2">{b.emoji}</span>
                  <span className="text-xs">{b.name}</span>
                  <span className="text-xs font-bold">{prices[b.type]} ore</span>
                  <span className="text-xs text-muted-foreground">{kingdom[key]}/{MAX_BUILDINGS}</span>
                </Button>
              );
            })}
          </div>
        </Card>

        <div className="text-center">
          <Button onClick={() => setAutoCollect(!autoCollect)} size="lg" variant={autoCollect ? "default" : "outline"}>
            {autoCollect ? "⏸ Auto-Farm ON" : "▶ Start Auto-Farm"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Ore produced every 3s • Auto-refines to 💎 every 8s • Castles multiply all production by 1.25× each • <strong>Zero credits involved</strong>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BullKingdom;
