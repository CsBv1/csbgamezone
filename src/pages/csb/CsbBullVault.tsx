import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Lock, Trophy, Sparkles, Vault, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }

// Risk-vs-reward: open boxes, escape before bomb
export default function CsbBullVault() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "playing" | "done">("select");
  const [boxes, setBoxes] = useState<{ idx: number; bomb: boolean; value: number; opened: boolean }[]>([]);
  const [pot, setPot] = useState(0);
  const [reward, setReward] = useState(0);
  const [busted, setBusted] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id");
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_") && (walletNfts.length === 0 || walletNfts.some((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`)));
      setBulls(rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const num = (r.nft_name || "").match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` };
      }));
    })();
  }, [userId, walletNfts.length]);

  const buildBoard = (bull: CsbBull) => {
    const rare = RARITY_BASE[bull.rarity] || 1;
    const lvl = 1 + bull.level * 0.05;
    const arr = Array.from({ length: 16 }, (_, i) => ({
      idx: i,
      bomb: false,
      value: Math.round((10 + Math.random() * 30) * rare * lvl),
      opened: false,
    }));
    // 4 bombs
    const bombs = new Set<number>();
    while (bombs.size < 4) bombs.add(Math.floor(Math.random() * 16));
    bombs.forEach((b) => (arr[b].bomb = true));
    return arr;
  };

  const start = (bull: CsbBull) => {
    setSelected(bull); setBoxes(buildBoard(bull)); setPot(0); setBusted(false); setState("playing");
  };

  const open = (i: number) => {
    if (state !== "playing" || boxes[i].opened) return;
    const next = boxes.map((b) => b.idx === i ? { ...b, opened: true } : b);
    setBoxes(next);
    if (boxes[i].bomb) {
      setBusted(true);
      finish(0);
    } else {
      setPot((p) => p + boxes[i].value);
    }
  };

  const cashOut = () => finish(pot);

  const finish = async (earned: number) => {
    setReward(earned);
    setState("done");
    if (earned > 0) await addBalance(earned);
    if (userId) await supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Vault", result: earned > 0 ? "win" : "loss", diamonds_won: 0 });
    toast({ title: earned > 0 ? "💰 Vault Cleared!" : "💥 Bull Got Bombed!", description: `+${earned} $CsBv1` });
  };

  const reset = () => { setState("select"); setSelected(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">🔐 CSB BULL VAULT</h1>
          <p className="text-sm text-muted-foreground mt-1">Open boxes for $CsBv1. Avoid 4 bombs. Cash out anytime!</p>
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
              <h2 className="text-lg font-bold mb-3 text-center">Pick your safecracker</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)} className="p-3 bg-gradient-to-br from-violet-700 to-fuchsia-900 border-2 border-violet-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Vault className="w-3 h-3 mr-1" /> Crack</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "playing" && (
          <Card className="bg-slate-900/80 border-violet-800/40 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Badge className="bg-violet-700">💰 Pot: {pot} $CsBv1</Badge>
              <Button size="sm" onClick={cashOut} disabled={pot === 0} className="bg-gradient-to-r from-emerald-500 to-teal-500">Cash Out</Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {boxes.map((b) => (
                <button key={b.idx} onClick={() => open(b.idx)} disabled={b.opened}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all
                    ${b.opened
                      ? b.bomb
                        ? "bg-rose-700 border-rose-300 text-white"
                        : "bg-emerald-700/50 border-emerald-400 text-emerald-100"
                      : "bg-slate-800 border-violet-500/40 hover:bg-violet-800/40"}`}>
                  {b.opened ? (b.bomb ? <ShieldAlert className="w-6 h-6" /> : `+${b.value}`) : <Lock className="w-5 h-5 opacity-40" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">4 bombs hidden. Hit one and you lose everything.</p>
          </Card>
        )}

        {state === "done" && (
          <Card className="bg-slate-900/80 border-violet-800/40 p-6 text-center space-y-3">
            {busted ? <ShieldAlert className="w-16 h-16 mx-auto text-rose-400" /> : <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />}
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500">Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
