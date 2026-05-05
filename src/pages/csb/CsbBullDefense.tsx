import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Shield, Trophy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const WAVES = 8;

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }
interface Enemy { id: number; x: number; hp: number; maxHp: number; speed: number }

export default function CsbBullDefense() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "play" | "won" | "lost">("select");
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [baseHp, setBaseHp] = useState(100);
  const [reward, setReward] = useState(0);
  const idRef = useRef(0);
  const tickRef = useRef<any>(null);
  const spawnRef = useRef<any>(null);
  const stateRef = useRef<{ wave: number; baseHp: number; bull: CsbBull | null }>({ wave: 1, baseHp: 100, bull: null });

  useEffect(() => {
    stateRef.current = { wave, baseHp, bull: selected };
  }, [wave, baseHp, selected]);

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

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
  }, []);

  const spawnEnemy = () => {
    const w = stateRef.current.wave;
    const hp = 30 + w * 12;
    setEnemies((arr) => [...arr, { id: ++idRef.current, x: 0, hp, maxHp: hp, speed: 0.4 + w * 0.08 }]);
  };

  const start = (bull: CsbBull) => {
    setSelected(bull);
    setWave(1);
    setBaseHp(100);
    setEnemies([]);
    setState("play");
    stateRef.current = { wave: 1, baseHp: 100, bull };

    tickRef.current = setInterval(() => {
      setEnemies((arr) => {
        const next: Enemy[] = [];
        let breached = 0;
        for (const e of arr) {
          const nx = e.x + e.speed;
          if (nx >= 100) { breached += 10; continue; }
          if (e.hp <= 0) continue;
          next.push({ ...e, x: nx });
        }
        if (breached > 0) {
          setBaseHp((hp) => {
            const nh = hp - breached;
            if (nh <= 0) { endGame(false); return 0; }
            return nh;
          });
        }
        return next;
      });
    }, 80);

    spawnRef.current = setInterval(() => {
      const w = stateRef.current.wave;
      if (Math.random() < 0.3 + w * 0.05) spawnEnemy();
    }, 700);

    // Wave timer
    const waveAdvance = setInterval(() => {
      setWave((w) => {
        if (w >= WAVES) {
          clearInterval(waveAdvance);
          setTimeout(() => endGame(true), 2000);
          return w;
        }
        return w + 1;
      });
    }, 8000);
  };

  const shoot = (id: number) => {
    if (!stateRef.current.bull) return;
    const bull = stateRef.current.bull;
    const rarityMult = RARITY_BASE[bull.rarity] || 1;
    const lvlMult = 1 + bull.level * 0.05;
    const dmg = Math.floor(20 * rarityMult * lvlMult);
    setEnemies((arr) => arr.map((e) => e.id === id ? { ...e, hp: e.hp - dmg } : e).filter((e) => e.hp > 0));
  };

  const endGame = async (win: boolean) => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    setState(win ? "won" : "lost");
    const bull = stateRef.current.bull;
    if (bull) {
      const rarityMult = RARITY_BASE[bull.rarity] || 1;
      const lvlMult = 1 + bull.level * 0.05;
      const earned = win ? Math.floor(120 * rarityMult * lvlMult) : Math.floor(15 * rarityMult);
      setReward(earned);
      await addBalance(earned);
      toast({ title: win ? "🛡️ Defended!" : "💥 Base Fell", description: `+${earned} $CsBv1` });
    }
    if (userId) {
      await supabase.from("game_results").insert({
        user_id: userId, game_name: "CSB Bull Defense", result: win ? "win" : "loss", diamonds_won: 0,
      });
    }
  };

  const reset = () => { setState("select"); setSelected(null); setEnemies([]); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">🛡️ CSB BULL DEFENSE</h1>
          <p className="text-sm text-muted-foreground mt-1">Tap enemies to blast them. Survive {WAVES} waves. Earn <span className="text-amber-300">$CsBv1</span></p>
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
              <h2 className="text-lg font-bold mb-3 text-center">Pick your defender</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)}
                    className="p-3 bg-gradient-to-br from-indigo-700 to-violet-900 border-2 border-indigo-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · DMG x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Shield className="w-3 h-3 mr-1" /> Defend</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "play" && (
          <Card className="bg-slate-900/80 border-indigo-800/40 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-indigo-300 font-bold">Wave {wave}/{WAVES}</span>
              <span className="text-rose-300 font-bold">🏰 Base: {baseHp} HP</span>
            </div>
            <div className="relative w-full h-64 md:h-80 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-rose-950/60 rounded-lg overflow-hidden border border-indigo-700/40">
              {/* Base on right */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-rose-500/50" />
              {/* Bull tower on left */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-4xl">🐂</div>
              {enemies.map((e) => (
                <button key={e.id} onClick={() => shoot(e.id)}
                  style={{ left: `${e.x}%`, top: `${(e.id * 37) % 70 + 10}%` }}
                  className="absolute -translate-y-1/2 -translate-x-1/2 group">
                  <div className="text-3xl group-hover:scale-110 transition-transform">👹</div>
                  <div className="w-10 h-1 bg-slate-700 rounded mt-1">
                    <div className="h-full bg-rose-500 rounded" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">Tap enemies to attack them before they reach your base</p>
          </Card>
        )}

        {(state === "won" || state === "lost") && (
          <Card className="bg-slate-900/80 border-indigo-800/40 p-6 text-center space-y-3">
            <Trophy className={`w-16 h-16 mx-auto ${state === "won" ? "text-amber-300 animate-pulse" : "text-slate-500"}`} />
            <div className="text-2xl font-black">{state === "won" ? "Base Defended!" : "Base Destroyed"}</div>
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500">Play Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
