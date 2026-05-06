import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Swords, Trophy, Sparkles, Shield, Heart, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";
import { supabase } from "@/integrations/supabase/client";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

interface Fighter { name: string; hp: number; maxHp: number; atk: number; def: number; image?: string; }
type Move = "attack" | "guard" | "power";

export default function CsbBullArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();
  const bulls = useHeldCsbBulls(userId, walletNfts);

  const [selected, setSelected] = useState<HeldCsbBull | null>(null);
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"select" | "fight" | "done">("select");
  const [reward, setReward] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logRef.current?.scrollTo({ top: 9e9 }); }, [log]);

  const start = (b: HeldCsbBull) => {
    const rare = RARITY_BASE[b.rarity] || 1;
    const lvl = b.level;
    const yMax = Math.round(80 + lvl * 12 * rare);
    const yAtk = Math.round(12 + lvl * 2.5 * rare);
    const yDef = Math.round(4 + lvl * 0.8 * rare);
    const fMax = Math.round(yMax * (0.9 + Math.random() * 0.4));
    const fAtk = Math.round(yAtk * (0.85 + Math.random() * 0.4));
    const fDef = Math.round(yDef * (0.85 + Math.random() * 0.4));
    setSelected(b);
    setYou({ name: b.nft_name, hp: yMax, maxHp: yMax, atk: yAtk, def: yDef, image: b.image });
    setFoe({ name: `Rival Bull #${Math.floor(Math.random() * 999)}`, hp: fMax, maxHp: fMax, atk: fAtk, def: fDef });
    setRound(1); setLog([`The arena erupts! ${b.nft_name} enters the ring.`]); setState("fight");
  };

  const damage = (atk: number, def: number, mult = 1) => {
    const base = Math.max(2, atk - Math.floor(def * 0.5));
    const variance = 0.85 + Math.random() * 0.3;
    return Math.round(base * mult * variance);
  };

  const turn = async (move: Move) => {
    if (!you || !foe || busy) return;
    setBusy(true);
    let yhp = you.hp, fhp = foe.hp;
    let yourDmg = 0, foeDmg = 0;
    let yourGuard = false;
    if (move === "attack") yourDmg = damage(you.atk, foe.def, 1);
    if (move === "power") yourDmg = damage(you.atk, foe.def, 1.7);
    if (move === "guard") yourGuard = true;

    fhp = Math.max(0, fhp - yourDmg);
    const lines: string[] = [];
    if (yourDmg) lines.push(`⚔️ You hit for ${yourDmg}.`);
    if (yourGuard) lines.push(`🛡️ You brace for impact.`);

    if (fhp > 0) {
      const foeMove: Move = Math.random() < 0.15 ? "guard" : Math.random() < 0.35 ? "power" : "attack";
      if (foeMove === "attack") foeDmg = damage(foe.atk, you.def, 1);
      if (foeMove === "power") foeDmg = damage(foe.atk, you.def, 1.6);
      if (yourGuard) foeDmg = Math.floor(foeDmg * 0.35);
      yhp = Math.max(0, yhp - foeDmg);
      if (foeDmg) lines.push(`💢 Rival hits you for ${foeDmg}${yourGuard ? " (blocked)" : ""}.`);
      else lines.push(`Rival guards.`);
    }

    setYou({ ...you, hp: yhp });
    setFoe({ ...foe, hp: fhp });
    setLog((l) => [...l, ...lines]);
    setRound((r) => r + 1);

    if (fhp <= 0 || yhp <= 0) {
      const won = fhp <= 0 && yhp > 0;
      await finish(won, you.maxHp - yhp);
    }
    setBusy(false);
  };

  const finish = async (won: boolean, dmgTaken: number) => {
    setState("done");
    if (!selected) return;
    const rare = RARITY_BASE[selected.rarity] || 1;
    const lvl = 1 + selected.level * 0.05;
    const base = won ? 250 : 60;
    const bonus = won ? Math.max(0, 150 - dmgTaken) : 0;
    const earned = Math.floor((base + bonus) * rare * lvl);
    setReward(earned);
    if (earned > 0) await addBalance(earned);
    if (userId) await supabase.from("game_results").insert({ user_id: userId, game_name: "CSB Bull Arena", result: won ? "win" : "loss", diamonds_won: 0 });
    toast({ title: won ? "🏆 Champion!" : "💀 Defeated", description: `+${earned} $CsBv1` });
  };

  const reset = () => { setState("select"); setSelected(null); setYou(null); setFoe(null); setLog([]); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-rose-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">⚔️ CSB BULL ARENA</h1>
          <p className="text-sm text-muted-foreground mt-1">Turn-based duels. Pick your move. Higher level + rarity = more HP, ATK, DEF.</p>
        </div>

        {state === "select" && (
          bulls.length === 0 ? (
            <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No CSB Bulls in your wallet. Hold a bull to enter the arena.</p>
              <Button onClick={() => navigate("/csb/nft-power")}>Go to NFT Power</Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-3 text-center">Pick your champion</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)} className="p-3 bg-gradient-to-br from-rose-700 to-fuchsia-900 border-2 border-rose-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-rose-200" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Swords className="w-3 h-3 mr-1" /> Fight</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "fight" && you && foe && (
          <Card className="bg-slate-900/80 border-rose-800/40 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FighterPanel f={you} side="you" />
              <FighterPanel f={foe} side="foe" />
            </div>
            <div className="text-center text-xs text-muted-foreground">Round {round}</div>
            <div ref={logRef} className="h-24 overflow-y-auto bg-black/40 rounded-lg p-2 text-xs space-y-1 ring-1 ring-white/5">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button disabled={busy} onClick={() => turn("attack")} className="bg-gradient-to-r from-rose-500 to-orange-500"><Swords className="w-4 h-4 mr-1" />Attack</Button>
              <Button disabled={busy} onClick={() => turn("guard")} variant="outline"><Shield className="w-4 h-4 mr-1" />Guard</Button>
              <Button disabled={busy} onClick={() => turn("power")} className="bg-gradient-to-r from-amber-500 to-rose-500"><Zap className="w-4 h-4 mr-1" />Power</Button>
            </div>
          </Card>
        )}

        {state === "done" && (
          <Card className="bg-slate-900/80 border-rose-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-rose-500 to-fuchsia-500">Rematch</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function FighterPanel({ f, side }: { f: Fighter; side: "you" | "foe" }) {
  const pct = (f.hp / f.maxHp) * 100;
  return (
    <div className={`rounded-lg p-3 ring-1 ${side === "you" ? "ring-cyan-400/40 bg-cyan-950/30" : "ring-rose-400/40 bg-rose-950/30"}`}>
      <div className="aspect-square rounded-lg bg-black/40 mb-2 overflow-hidden flex items-center justify-center">
        {f.image ? <img src={f.image} alt={f.name} className="w-full h-full object-cover" /> : <Swords className="w-10 h-10 opacity-60" />}
      </div>
      <div className="text-xs font-bold truncate">{f.name}</div>
      <div className="flex items-center gap-1 text-[10px] mt-1"><Heart className="w-3 h-3 text-rose-400" /> {f.hp}/{f.maxHp}</div>
      <Progress value={pct} className="h-1.5 mt-1" />
      <div className="flex justify-between text-[10px] mt-1 opacity-80"><span>ATK {f.atk}</span><span>DEF {f.def}</span></div>
    </div>
  );
}
