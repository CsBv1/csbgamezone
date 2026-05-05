import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Swords, Trophy, Sparkles, Skull, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }

const BOSSES = [
  { name: "Shadow Minotaur", hp: 600, dmg: 8, emoji: "👹", reward: 60 },
  { name: "Crimson Drakebull", hp: 1200, dmg: 14, emoji: "🐲", reward: 140 },
  { name: "Eclipse Titan", hp: 2200, dmg: 22, emoji: "💀", reward: 280 },
];

export default function CsbBossRaid() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [bossIdx, setBossIdx] = useState(0);
  const [state, setState] = useState<"select" | "fight" | "won" | "lost">("select");
  const [bossHp, setBossHp] = useState(0);
  const [myHp, setMyHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [reward, setReward] = useState(0);
  const [shake, setShake] = useState(false);
  const tickRef = useRef<any>(null);

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

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const start = (bull: CsbBull, bIdx: number) => {
    setSelected(bull);
    setBossIdx(bIdx);
    setBossHp(BOSSES[bIdx].hp);
    setMyHp(100);
    setCombo(0);
    setState("fight");
    tickRef.current = setInterval(() => {
      setMyHp((hp) => {
        const dmg = BOSSES[bIdx].dmg / 4;
        const next = hp - dmg;
        if (next <= 0) { clearInterval(tickRef.current); finish(false, bull, bIdx); return 0; }
        return next;
      });
    }, 1000);
  };

  const attack = () => {
    if (state !== "fight" || !selected) return;
    const rarityMult = RARITY_BASE[selected.rarity] || 1;
    const lvlMult = 1 + selected.level * 0.05;
    const baseDmg = 25 * rarityMult * lvlMult;
    const dmg = Math.floor(baseDmg * (1 + combo * 0.05));
    setCombo((c) => Math.min(c + 1, 20));
    setShake(true); setTimeout(() => setShake(false), 120);
    setBossHp((hp) => {
      const next = hp - dmg;
      if (next <= 0) { clearInterval(tickRef.current); finish(true, selected, bossIdx); return 0; }
      return next;
    });
  };

  const finish = async (win: boolean, bull: CsbBull, bIdx: number) => {
    if (win) {
      const rarityMult = RARITY_BASE[bull.rarity] || 1;
      const lvlMult = 1 + bull.level * 0.05;
      const earned = Math.floor(BOSSES[bIdx].reward * rarityMult * lvlMult);
      setReward(earned);
      await addBalance(earned);
      setState("won");
      toast({ title: `🏆 Boss Defeated!`, description: `+${earned} $CsBv1` });
    } else {
      setState("lost");
      toast({ title: "💀 Defeated", description: "Try a stronger bull!" });
    }
    if (userId) {
      await supabase.from("game_results").insert({
        user_id: userId, game_name: "CSB Boss Raid", result: win ? "win" : "loss", diamonds_won: 0,
      });
    }
  };

  const reset = () => { setState("select"); setSelected(null); setBossHp(0); setMyHp(100); setCombo(0); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-rose-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">⚔️ CSB BOSS RAID</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap to attack! Build combos. Bigger boss = more <span className="text-amber-300">$CsBv1</span></p>
        </div>

        {state === "select" && (
          bulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls registered. Visit NFT Power first.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">Pick a boss</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {BOSSES.map((b, i) => (
                  <Card key={i} className={`p-4 bg-gradient-to-br border-2 cursor-pointer hover:scale-[1.02] transition-transform ${i === 0 ? "from-amber-700 to-rose-900 border-amber-300/30" : i === 1 ? "from-rose-700 to-purple-900 border-rose-300/30" : "from-purple-800 to-slate-950 border-purple-300/30"}`}
                    onClick={() => setBossIdx(i)}>
                    <div className="text-5xl text-center">{b.emoji}</div>
                    <div className="text-center font-bold mt-1">{b.name}</div>
                    <div className="text-center text-xs opacity-90">HP {b.hp} · {b.reward}+ $CsBv1</div>
                    {bossIdx === i && <Badge className="mt-2 w-full justify-center bg-amber-500 text-black">SELECTED</Badge>}
                  </Card>
                ))}
              </div>
              <h2 className="text-lg font-bold text-center mt-4">Pick your fighter</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b, bossIdx)}
                    className="p-3 bg-gradient-to-br from-rose-700 to-orange-900 border-2 border-amber-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Swords className="w-3 h-3 mr-1" /> Raid</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "fight" && selected && (
          <Card className="bg-slate-900/80 border-rose-800/40 p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-rose-300 font-bold flex items-center gap-1"><Skull className="w-4 h-4" />{BOSSES[bossIdx].name}</span><span>{Math.max(0, Math.ceil(bossHp))} HP</span></div>
              <Progress value={(bossHp / BOSSES[bossIdx].hp) * 100} className="h-3" />
            </div>
            <div className={`relative w-full aspect-[4/3] bg-gradient-to-b from-rose-900/40 to-slate-950 rounded-lg overflow-hidden border border-rose-700/40 flex items-center justify-center ${shake ? "translate-x-1" : ""}`}>
              <div className="text-9xl">{BOSSES[bossIdx].emoji}</div>
              {combo > 0 && <div className="absolute top-2 right-2 text-amber-300 font-black text-2xl drop-shadow">x{combo} COMBO</div>}
              <button onClick={attack} className="absolute inset-0 bg-transparent hover:bg-amber-500/10 active:bg-amber-500/20" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-emerald-300 font-bold flex items-center gap-1"><Heart className="w-4 h-4" />{selected.nft_name}</span><span>{Math.max(0, Math.ceil(myHp))} HP</span></div>
              <Progress value={myHp} className="h-3" />
            </div>
            <Button onClick={attack} size="lg" className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-lg font-black"><Swords className="w-5 h-5 mr-2" /> ATTACK</Button>
          </Card>
        )}

        {(state === "won" || state === "lost") && (
          <Card className="bg-slate-900/80 border-rose-800/40 p-6 text-center space-y-3">
            {state === "won" ? <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" /> : <Skull className="w-16 h-16 mx-auto text-rose-400" />}
            <div className="text-2xl font-black">{state === "won" ? "Victory!" : "Defeated"}</div>
            {state === "won" && <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>}
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected, bossIdx)} className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500">Rematch</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Boss</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
