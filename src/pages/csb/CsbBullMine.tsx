import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Pickaxe, Trophy, Sparkles, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const TICKS = 30;

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }

export default function CsbBullMine() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "mining" | "finish">("select");
  const [progress, setProgress] = useState(0);
  const [taps, setTaps] = useState(0);
  const [reward, setReward] = useState(0);
  const tickRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase.from("csbv1_nft_power" as any)
        .select("*").eq("user_id", userId).order("nft_id");
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_") && (walletNfts.length === 0 || walletNfts.some((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`)));
      const merged = rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const numMatch = (r.nft_name || "").match(/(\d+)\s*$/);
        const num = numMatch ? numMatch[1] : String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` } as CsbBull;
      });
      setBulls(merged);
    };
    load();
  }, [userId, walletNfts.length]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const start = (bull: CsbBull) => {
    setSelected(bull);
    setProgress(0);
    setTaps(0);
    setState("mining");
    let count = 0;
    tickRef.current = setInterval(() => {
      count += 1;
      setProgress(Math.min(100, (count / TICKS) * 100));
      if (count >= TICKS) {
        clearInterval(tickRef.current);
        finish(bull);
      }
    }, 500);
  };

  const tap = () => {
    if (state !== "mining") return;
    setTaps((t) => t + 1);
  };

  const finish = async (bull: CsbBull) => {
    setState("finish");
    const rarityMult = RARITY_BASE[bull.rarity] || 1;
    const lvlMult = 1 + bull.level * 0.05;
    const earned = Math.floor((20 + taps * 0.5) * rarityMult * lvlMult);
    setReward(earned);
    await addBalance(earned);
    if (userId) {
      await supabase.from("game_results").insert({
        user_id: userId, game_name: "CSB Bull Mine", result: "win", diamonds_won: 0,
      });
    }
    toast({ title: "⛏️ Mined!", description: `+${earned} $CsBv1 (${taps} taps)` });
  };

  const reset = () => { setState("select"); setSelected(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">⛏️ CSB BULL MINE</h1>
          <p className="text-sm text-muted-foreground mt-1">Send your bull mining! Tap to boost output. Earn <span className="text-amber-300">$CsBv1</span></p>
        </div>

        {state === "select" && (
          bulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls registered. Visit NFT Power first.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Pick your miner</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)}
                    className="p-3 bg-gradient-to-br from-sky-700 to-blue-900 border-2 border-sky-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Pickaxe className="w-3 h-3 mr-1" /> Mine</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "mining" && (
          <Card className="bg-slate-900/80 border-sky-800/40 p-4 space-y-4 text-center">
            <div className="text-sm text-muted-foreground">Mining... {Math.floor(progress)}%</div>
            <div className="h-3 bg-slate-800 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <Button onClick={tap} size="lg"
              className="w-full h-24 text-2xl bg-gradient-to-b from-amber-400 to-orange-600 hover:from-amber-300 active:scale-95">
              <Pickaxe className="w-6 h-6 mr-2" /> TAP TO MINE! ({taps})
            </Button>
            <div className="text-xs text-amber-300/80">Each tap adds output to your reward.</div>
          </Card>
        )}

        {state === "finish" && (
          <Card className="bg-slate-900/80 border-sky-800/40 p-6 text-center space-y-3">
            <Gem className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <div className="text-2xl font-black">{taps} taps</div>
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500">Mine Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
