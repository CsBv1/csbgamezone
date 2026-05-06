import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Castle, Trophy, Sparkles, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }
interface Enemy { id: number; x: number; hp: number; maxHp: number; speed: number }

const TOTAL_WAVES = 5;

export default function CsbBullSiege() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "playing" | "done">("select");
  const [castleHp, setCastleHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState(0);
  const idRef = useRef(0);
  const tickRef = useRef<any>(null);
  const spawnRef = useRef<any>(null);
  const spawnedRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id");
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_"));
      setBulls(rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const num = (r.nft_name || "").match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` };
      }));
    })();
  }, [userId, walletNfts.length]);

  useEffect(() => () => { clearInterval(tickRef.current); clearInterval(spawnRef.current); }, []);

  const startWave = (w: number, bull: CsbBull) => {
    clearInterval(tickRef.current); clearInterval(spawnRef.current);
    spawnedRef.current = 0;
    const enemyCount = 6 + w * 2;
    const speed = 0.4 + w * 0.15;
    spawnRef.current = setInterval(() => {
      if (spawnedRef.current >= enemyCount) { clearInterval(spawnRef.current); spawnRef.current = null; return; }
      spawnedRef.current++;
      const hp = Math.round(20 + w * 10);
      setEnemies((es) => [...es, { id: ++idRef.current, x: 0, hp, maxHp: hp, speed }]);
    }, 800);

    tickRef.current = setInterval(() => {
      setEnemies((es) => {
        const moved: Enemy[] = [];
        let hit = 0;
        for (const e of es) {
          const nx = e.x + e.speed;
          if (nx >= 100) hit += 12;
          else moved.push({ ...e, x: nx });
        }
        if (hit > 0) setCastleHp((h) => Math.max(0, h - hit));
        return moved;
      });
    }, 100);
  };

  useEffect(() => {
    if (state !== "playing") return;
    if (castleHp <= 0) { finish(false); return; }
    const target = 6 + wave * 2;
    if (enemies.length === 0 && spawnedRef.current >= target && !spawnRef.current) {
      clearInterval(tickRef.current);
      if (wave >= TOTAL_WAVES) finish(true);
      else setWave((w) => w + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, castleHp, state, wave]);

  useEffect(() => {
    if (state !== "playing" || !selected) return;
    if (wave > 1) startWave(wave, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave]);

  const start = (bull: CsbBull) => {
    setSelected(bull); setCastleHp(100); setWave(1); setScore(0); setEnemies([]);
    setState("playing");
    setTimeout(() => startWave(1, bull), 300);
  };

  const shoot = (e: Enemy) => {
    if (!selected) return;
    const rare = RARITY_BASE[selected.rarity] || 1;
    const dmg = Math.round(15 * rare * (1 + selected.level * 0.05));
    setEnemies((es) => es.map((x) => x.id === e.id ? { ...x, hp: x.hp - dmg } : x).filter((x) => x.hp > 0 ? true : (setScore((s) => s + x.maxHp), false)));
  };

  const finish = async (won: boolean) => {
    clearInterval(tickRef.current); clearInterval(spawnRef.current);
    setState("done");
    if (!selected) return;
    const rare = RARITY_BASE[selected.rarity] || 1;
    const lvl = 1 + selected.level * 0.05;
    const base = won ? 200 : 50;
    const earned = Math.floor((base + score * 0.2) * rare * lvl);
    setReward(earned);
    if (earned > 0) await addBalance(earned);
    if (userId) await supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Siege", result: won ? "win" : "loss", diamonds_won: 0 });
    toast({ title: won ? "🏰 Castle Defended!" : "💥 Castle Fell", description: `+${earned} $CsBv1` });
  };

  const reset = () => { setState("select"); setSelected(null); setEnemies([]); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/30 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-300 via-orange-300 to-rose-400 bg-clip-text text-transparent">🏰 CSB BULL SIEGE</h1>
          <p className="text-sm text-muted-foreground mt-1">Defend the castle. Tap enemies to shoot. 5 waves.</p>
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
                  <Card key={b.nft_id} onClick={() => start(b)} className="p-3 bg-gradient-to-br from-amber-700 to-rose-900 border-2 border-amber-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Castle className="w-3 h-3 mr-1" /> Defend</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "playing" && (
          <Card className="bg-slate-900/80 border-amber-800/40 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <Badge className="bg-rose-700">Wave {wave}/{TOTAL_WAVES}</Badge>
              <span className="text-amber-300 font-bold">Score: {score}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>🏰 Castle HP</span><span>{castleHp}/100</span></div>
              <Progress value={castleHp} className="h-2" />
            </div>
            <div className="relative w-full aspect-[16/9] bg-gradient-to-r from-rose-950 via-orange-950 to-amber-950 rounded-lg overflow-hidden border border-amber-700/40">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-amber-500/40 to-transparent flex items-center justify-center"><Castle className="w-8 h-8 text-amber-300" /></div>
              {enemies.map((e) => (
                <button key={e.id} onClick={() => shoot(e)} style={{ left: `${e.x}%`, top: `${20 + (e.id % 5) * 12}%` }} className="absolute w-10 h-10 -translate-x-1/2 rounded-full bg-rose-600 ring-2 ring-rose-300 hover:scale-110 transition-transform">
                  <Swords className="w-5 h-5 mx-auto text-white" />
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-black/50 rounded"><div className="h-full bg-emerald-400 rounded" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} /></div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {state === "done" && (
          <Card className="bg-slate-900/80 border-amber-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-amber-500 to-rose-500">Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
