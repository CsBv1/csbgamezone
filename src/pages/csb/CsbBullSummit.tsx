import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Trophy, Sparkles, Mountain, Skull, Gem, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";
import { supabase } from "@/integrations/supabase/client";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

type Tile = "loot" | "monster" | "rest" | "boss" | "trap" | "shrine";
const TILE_ICON: Record<Tile, string> = { loot: "💰", monster: "👹", rest: "🛌", boss: "💀", trap: "⚠️", shrine: "✨" };

const ROUTE_LEN = 12;

function genRoute(): Tile[] {
  const r: Tile[] = [];
  for (let i = 0; i < ROUTE_LEN - 1; i++) {
    const roll = Math.random();
    if (roll < 0.35) r.push("monster");
    else if (roll < 0.55) r.push("loot");
    else if (roll < 0.7) r.push("trap");
    else if (roll < 0.85) r.push("rest");
    else r.push("shrine");
  }
  r.push("boss");
  return r;
}

export default function CsbBullSummit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();
  const bulls = useHeldCsbBulls(userId, walletNfts);

  const [selected, setSelected] = useState<HeldCsbBull | null>(null);
  const [route, setRoute] = useState<Tile[]>([]);
  const [pos, setPos] = useState(0);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [loot, setLoot] = useState(0);
  const [state, setState] = useState<"select" | "climb" | "done">("select");
  const [reward, setReward] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logRef.current?.scrollTo({ top: 9e9 }); }, [log]);

  const start = (b: HeldCsbBull) => {
    const rare = RARITY_BASE[b.rarity] || 1;
    const m = Math.round(80 + b.level * 12 * rare);
    setSelected(b); setRoute(genRoute()); setPos(0); setHp(m); setMaxHp(m); setLoot(0);
    setLog([`🐂 ${b.nft_name} begins the climb to the Summit.`]); setState("climb");
  };

  const cashOut = async () => {
    if (!selected) return;
    setState("done");
    const rare = RARITY_BASE[selected.rarity] || 1;
    const lvl = 1 + selected.level * 0.05;
    const earned = Math.floor(loot * rare * lvl);
    setReward(earned);
    if (earned > 0) await addBalance(earned);
    if (userId) await supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Summit", result: pos >= ROUTE_LEN ? "win" : "loss", diamonds_won: 0 });
    toast({ title: pos >= ROUTE_LEN ? "🏔️ Summit Reached!" : "🏕️ Retreated safely", description: `+${earned} $CsBv1` });
  };

  const advance = async () => {
    if (!selected || pos >= ROUTE_LEN) return;
    const tile = route[pos];
    const rare = RARITY_BASE[selected.rarity] || 1;
    const lvl = 1 + selected.level * 0.05;
    const lines: string[] = [];
    let nhp = hp, nl = loot;
    if (tile === "loot") {
      const g = Math.round(40 + Math.random() * 60);
      nl += g; lines.push(`💰 Found ${g} $CsBv1.`);
    } else if (tile === "monster") {
      const dmg = Math.round((10 + Math.random() * 20) / Math.max(0.7, rare * lvl));
      nhp = Math.max(0, nhp - dmg);
      const reward = Math.round(60 + Math.random() * 40);
      nl += reward;
      lines.push(`👹 Fought a beast! -${dmg} HP, +${reward} $CsBv1.`);
    } else if (tile === "trap") {
      const dmg = Math.round((15 + Math.random() * 15) / Math.max(0.8, rare));
      nhp = Math.max(0, nhp - dmg);
      lines.push(`⚠️ Trap! -${dmg} HP.`);
    } else if (tile === "rest") {
      const heal = Math.round(maxHp * 0.25);
      nhp = Math.min(maxHp, nhp + heal);
      lines.push(`🛌 Rested. +${heal} HP.`);
    } else if (tile === "shrine") {
      const heal = Math.round(maxHp * 0.15);
      const g = Math.round(80 + Math.random() * 40);
      nhp = Math.min(maxHp, nhp + heal); nl += g;
      lines.push(`✨ Shrine blessing! +${heal} HP, +${g} $CsBv1.`);
    } else if (tile === "boss") {
      const dmg = Math.round(35 / Math.max(0.6, rare * lvl));
      nhp = Math.max(0, nhp - dmg);
      const big = Math.round(400 + Math.random() * 200);
      nl += big;
      lines.push(`💀 BOSS DEFEATED! -${dmg} HP, +${big} $CsBv1.`);
    }
    setHp(nhp); setLoot(nl); setPos(pos + 1); setLog((l) => [...l, ...lines]);
    if (nhp <= 0) {
      setLog((l) => [...l, `💔 ${selected.nft_name} fell. Lost half the loot!`]);
      const rare2 = RARITY_BASE[selected.rarity] || 1;
      const lvl2 = 1 + selected.level * 0.05;
      const earned = Math.floor(nl * 0.5 * rare2 * lvl2);
      setReward(earned); setState("done");
      if (earned > 0) await addBalance(earned);
      if (userId) await supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Summit", result: "loss", diamonds_won: 0 });
      toast({ title: "💔 Defeated", description: `+${earned} $CsBv1 (50% loot)` });
    } else if (pos + 1 >= ROUTE_LEN) {
      // auto cash out at summit
      setTimeout(() => {
        const rare2 = RARITY_BASE[selected.rarity] || 1;
        const lvl2 = 1 + selected.level * 0.05;
        const earned = Math.floor(nl * 1.25 * rare2 * lvl2);
        setReward(earned); setState("done");
        addBalance(earned);
        if (userId) supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Summit", result: "win", diamonds_won: 0 });
        toast({ title: "🏔️ Summit Conquered!", description: `+${earned} $CsBv1 (1.25x summit bonus)` });
      }, 500);
    }
  };

  const reset = () => { setState("select"); setSelected(null); setRoute([]); setLog([]); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">🏔️ CSB BULL SUMMIT</h1>
          <p className="text-sm text-muted-foreground mt-1">Risk-vs-reward climb. Push for the summit or retreat with loot.</p>
        </div>

        {state === "select" && (
          bulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls in your wallet.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Pick your climber</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)} className="p-3 bg-gradient-to-br from-sky-700 to-emerald-900 border-2 border-cyan-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-cyan-200" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level}</div>
                    <Button size="sm" className="w-full mt-2"><Mountain className="w-3 h-3 mr-1" /> Climb</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "climb" && selected && (
          <Card className="bg-slate-900/80 border-cyan-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-rose-400" /> {hp}/{maxHp}</div>
              <Badge className="bg-emerald-600"><Gem className="w-3 h-3 mr-1" /> {loot} $CsBv1</Badge>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {route.map((t, i) => (
                <div key={i} className={`aspect-square rounded flex items-center justify-center text-sm ring-1 ${i < pos ? "bg-emerald-700/40 ring-emerald-400/30" : i === pos ? "bg-amber-700/50 ring-amber-300 animate-pulse" : "bg-slate-800/40 ring-slate-700"}`}>
                  {i <= pos || i === pos ? TILE_ICON[t] : "·"}
                </div>
              ))}
            </div>
            <div ref={logRef} className="h-28 overflow-y-auto bg-black/40 rounded-lg p-2 text-xs space-y-1 ring-1 ring-white/5">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            {pos < ROUTE_LEN && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={advance} className="bg-gradient-to-r from-sky-500 to-emerald-500"><Mountain className="w-4 h-4 mr-1" />Climb Higher ({TILE_ICON[route[pos]]})</Button>
                <Button onClick={cashOut} variant="outline">🏕️ Retreat ({loot})</Button>
              </div>
            )}
          </Card>
        )}

        {state === "done" && (
          <Card className="bg-slate-900/80 border-cyan-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-sky-500 to-emerald-500">Climb Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
