import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Dice5, Trophy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const ROUNDS = 5;

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }

export default function CsbDiceDuel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "play" | "finish">("select");
  const [round, setRound] = useState(1);
  const [myScore, setMyScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [myDice, setMyDice] = useState<number[]>([]);
  const [aiDice, setAiDice] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [reward, setReward] = useState(0);
  const rollRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id");
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

  useEffect(() => () => { if (rollRef.current) clearInterval(rollRef.current); }, []);

  const rollDice = (count = 3) => Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));

  const start = (bull: CsbBull) => {
    setSelected(bull);
    setRound(1);
    setMyScore(0);
    setAiScore(0);
    setMyDice([]);
    setAiDice([]);
    setState("play");
  };

  const playRound = async () => {
    if (!selected || rolling) return;
    setRolling(true);
    let ticks = 0;
    rollRef.current = setInterval(() => {
      setMyDice(rollDice());
      setAiDice(rollDice());
      ticks++;
      if (ticks >= 8) {
        clearInterval(rollRef.current);
        const my = rollDice();
        const ai = rollDice();
        const rarityMult = RARITY_BASE[selected.rarity] || 1;
        const lvlMult = 1 + selected.level * 0.05;
        const myTotal = my.reduce((a, b) => a + b, 0) + Math.floor(rarityMult * lvlMult * 2);
        const aiTotal = ai.reduce((a, b) => a + b, 0) + Math.floor(Math.random() * 4);
        setMyDice(my);
        setAiDice(ai);
        const newMy = myScore + (myTotal > aiTotal ? 1 : 0);
        const newAi = aiScore + (aiTotal > myTotal ? 1 : 0);
        setMyScore(newMy);
        setAiScore(newAi);
        setRolling(false);
        if (round >= ROUNDS) finish(newMy, newAi);
        else setRound(round + 1);
      }
    }, 80);
  };

  const finish = async (my: number, ai: number) => {
    setState("finish");
    const win = my > ai;
    if (selected) {
      const rarityMult = RARITY_BASE[selected.rarity] || 1;
      const lvlMult = 1 + selected.level * 0.05;
      const earned = win ? Math.floor(50 * rarityMult * lvlMult) : Math.floor(8 * rarityMult);
      setReward(earned);
      await addBalance(earned);
      toast({ title: win ? "🎲 Duel Won!" : "🎲 Duel Lost", description: `+${earned} $CsBv1` });
    }
    if (userId) {
      await supabase.from("game_results").insert({
        user_id: userId, game_name: "CSB Dice Duel", result: win ? "win" : "loss", diamonds_won: 0,
      });
    }
  };

  const reset = () => { setState("select"); setSelected(null); };

  const Die = ({ v }: { v: number }) => (
    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-white to-slate-200 text-slate-900 flex items-center justify-center text-3xl font-black shadow-lg">{v}</div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400 bg-clip-text text-transparent">🎲 CSB DICE DUEL</h1>
          <p className="text-sm text-muted-foreground mt-1">Best of {ROUNDS}. Higher level/rarity = better odds. Earn <span className="text-amber-300">$CsBv1</span></p>
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
              <h2 className="text-lg font-bold mb-3 text-center">Pick your duelist</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)}
                    className="p-3 bg-gradient-to-br from-emerald-700 to-teal-900 border-2 border-emerald-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · +{Math.floor((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05) * 2)} bonus</div>
                    <Button size="sm" className="w-full mt-2"><Dice5 className="w-3 h-3 mr-1" /> Duel</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "play" && selected && (
          <Card className="bg-slate-900/80 border-emerald-800/40 p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-300 font-bold">Round {round}/{ROUNDS}</span>
              <span>You {myScore} – {aiScore} AI</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-emerald-300 mb-2">{selected.nft_name}</div>
                <div className="flex gap-2 justify-center">{(myDice.length ? myDice : [1,1,1]).map((d, i) => <Die key={i} v={d} />)}</div>
              </div>
              <div className="text-center text-2xl font-black opacity-50">VS</div>
              <div>
                <div className="text-xs text-rose-300 mb-2">AI Bull</div>
                <div className="flex gap-2 justify-center">{(aiDice.length ? aiDice : [1,1,1]).map((d, i) => <Die key={i} v={d} />)}</div>
              </div>
            </div>
            <Button onClick={playRound} disabled={rolling} size="lg" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-lg font-black">
              {rolling ? "ROLLING..." : "🎲 ROLL"}
            </Button>
          </Card>
        )}

        {state === "finish" && (
          <Card className="bg-slate-900/80 border-emerald-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <div className="text-2xl font-black">You {myScore} – {aiScore} AI</div>
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500">Duel Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
