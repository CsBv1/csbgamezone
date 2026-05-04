import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Target, Trophy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const ROUND_SECONDS = 20;

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }
interface Tgt { id: number; x: number; y: number; size: number; pts: number }

export default function CsbBullHunt() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "playing" | "finish">("select");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(ROUND_SECONDS);
  const [target, setTarget] = useState<Tgt | null>(null);
  const [reward, setReward] = useState(0);
  const idRef = useRef(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase.from("csbv1_nft_power" as any)
        .select("*").eq("user_id", userId).order("nft_id");
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_"));
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

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const spawn = () => {
    const size = 40 + Math.random() * 50;
    setTarget({
      id: ++idRef.current,
      x: Math.random() * 80 + 5,
      y: Math.random() * 70 + 10,
      size,
      pts: Math.round(120 - size),
    });
  };

  const start = (bull: CsbBull) => {
    setSelected(bull);
    setScore(0);
    setTime(ROUND_SECONDS);
    setState("playing");
    spawn();
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finish(bull);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const finish = async (bull: CsbBull) => {
    setState("finish");
    setTarget(null);
    const rarityMult = RARITY_BASE[bull.rarity] || 1;
    const lvlMult = 1 + bull.level * 0.05;
    const earned = Math.max(1, Math.floor(score * 0.05 * rarityMult * lvlMult));
    setReward(earned);
    if (earned > 0) await addBalance(earned);
    if (userId) {
      await supabase.from("game_results").insert({
        user_id: userId, game_name: "CSB Bull Hunt", result: earned > 0 ? "win" : "loss", diamonds_won: 0,
      });
    }
    toast({ title: "🎯 Round Over", description: `Score ${score} → +${earned} $CsBv1` });
  };

  const hit = () => {
    if (!target || state !== "playing") return;
    setScore((s) => s + target.pts);
    spawn();
  };

  const reset = () => { setState("select"); setSelected(null); setScore(0); };

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
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">🎯 CSB BULL HUNT</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap targets fast! Smaller = more points. Earn <span className="text-amber-300">$CsBv1</span></p>
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
              <h2 className="text-lg font-bold mb-3 text-center">Pick your hunter</h2>
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
                    <Button size="sm" className="w-full mt-2"><Target className="w-3 h-3 mr-1" /> Hunt</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "playing" && (
          <Card className="bg-slate-900/80 border-sky-800/40 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-300 font-bold">⏱ {time}s</span>
              <span className="text-amber-300 font-bold">Score: {score}</span>
            </div>
            <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-800 to-slate-950 rounded-lg overflow-hidden border border-sky-700/40">
              {target && (
                <button onClick={hit}
                  style={{ left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size }}
                  className="absolute rounded-full bg-gradient-to-br from-amber-300 to-red-500 ring-4 ring-amber-200/40 hover:scale-110 transition-transform animate-pulse">
                  <Target className="w-1/2 h-1/2 mx-auto text-white" />
                </button>
              )}
            </div>
          </Card>
        )}

        {state === "finish" && (
          <Card className="bg-slate-900/80 border-sky-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <div className="text-2xl font-black">Score: {score}</div>
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500">Hunt Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
