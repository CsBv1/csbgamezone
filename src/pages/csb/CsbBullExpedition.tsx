import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Coins, Crown, Compass, Trophy, Sparkles, Skull, Gem, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }
type Room = { type: "loot" | "monster" | "trap" | "shrine"; payload: number };

const buildDungeon = (depth: number): Room[] => {
  const types: Room["type"][] = ["loot", "monster", "trap", "shrine"];
  const rooms: Room[] = [];
  for (let i = 0; i < depth; i++) {
    const t = types[Math.floor(Math.random() * types.length)];
    rooms.push({ type: t, payload: Math.round(20 + Math.random() * 40 + i * 5) });
  }
  return rooms;
};

export default function CsbBullExpedition() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<"select" | "running" | "done">("select");
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [loot, setLoot] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [reward, setReward] = useState(0);

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

  const start = (bull: CsbBull) => {
    setSelected(bull);
    const rare = RARITY_BASE[bull.rarity] || 1;
    const m = Math.round(80 + bull.level * 8 + rare * 30);
    setHp(m); setMaxHp(m); setLoot(0); setStep(0); setLog([`🐂 ${bull.nft_name} enters the dungeon!`]);
    setRooms(buildDungeon(8));
    setState("running");
  };

  const explore = () => {
    if (!selected || step >= rooms.length) return;
    const r = rooms[step];
    const rare = RARITY_BASE[selected.rarity] || 1;
    const lvl = 1 + selected.level * 0.05;
    let line = "";
    let newHp = hp;
    let newLoot = loot;
    if (r.type === "loot") { newLoot += Math.round(r.payload * rare * lvl); line = `💎 Found ${Math.round(r.payload * rare * lvl)} loot.`; }
    else if (r.type === "monster") { const dmg = Math.max(5, Math.round(r.payload / rare)); newHp = Math.max(0, hp - dmg); line = `⚔️ Fought beast! −${dmg} HP.`; }
    else if (r.type === "trap") { const dmg = Math.round(r.payload * 0.4); newHp = Math.max(0, hp - dmg); line = `☠️ Trap! −${dmg} HP.`; }
    else if (r.type === "shrine") { const heal = Math.round(maxHp * 0.25); newHp = Math.min(maxHp, hp + heal); line = `✨ Shrine heals +${heal} HP.`; }
    setHp(newHp); setLoot(newLoot);
    setLog((l) => [line, ...l].slice(0, 6));
    if (newHp <= 0) finish(false, newLoot);
    else if (step + 1 >= rooms.length) finish(true, newLoot);
    else setStep(step + 1);
  };

  const flee = () => finish(false, Math.floor(loot * 0.5));

  const finish = async (won: boolean, finalLoot: number) => {
    setState("done");
    const earned = won ? finalLoot : Math.floor(finalLoot * 0.6);
    setReward(earned);
    if (earned > 0) await addBalance(earned);
    if (userId) await supabase.from("game_results").insert({
      user_id: userId, game_name: "CSB Bull Expedition", result: won ? "win" : "loss", diamonds_won: 0,
    });
    toast({ title: won ? "🏆 Expedition Complete!" : "🏃 Retreated", description: `+${earned} $CsBv1` });
  };

  const reset = () => { setState("select"); setSelected(null); setLog([]); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm"><Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400 bg-clip-text text-transparent">🗺️ CSB BULL EXPEDITION</h1>
          <p className="text-sm text-muted-foreground mt-1">Send your bull deep into the dungeon. 8 rooms. Loot or perish.</p>
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
              <h2 className="text-lg font-bold mb-3 text-center">Pick your explorer</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bulls.map((b) => (
                  <Card key={b.nft_id} onClick={() => start(b)} className="p-3 bg-gradient-to-br from-emerald-700 to-teal-900 border-2 border-emerald-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                    <div className="font-bold text-sm">{b.nft_name}</div>
                    <div className="text-xs opacity-90">Lv {b.level} · x{((RARITY_BASE[b.rarity] || 1) * (1 + b.level * 0.05)).toFixed(2)}</div>
                    <Button size="sm" className="w-full mt-2"><Compass className="w-3 h-3 mr-1" /> Explore</Button>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}

        {state === "running" && selected && (
          <Card className="bg-slate-900/80 border-emerald-800/40 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-300" /><span className="font-bold">{selected.nft_name}</span></div>
              <Badge className="bg-emerald-700">Room {step + 1}/{rooms.length}</Badge>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>HP</span><span>{hp}/{maxHp}</span></div>
              <Progress value={(hp / maxHp) * 100} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm"><span className="text-amber-300 flex items-center gap-1"><Gem className="w-4 h-4" /> Loot: {loot}</span></div>
            <div className="bg-black/40 rounded-lg p-3 min-h-[120px] text-sm space-y-1 border border-emerald-900/40">
              {log.map((l, i) => <div key={i} className={i === 0 ? "text-emerald-200" : "text-muted-foreground/70 text-xs"}>{l}</div>)}
            </div>
            <div className="flex gap-2">
              <Button onClick={explore} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"><Map className="w-4 h-4 mr-1" /> Next Room</Button>
              <Button onClick={flee} variant="outline" className="flex-1"><Skull className="w-4 h-4 mr-1" /> Flee (50%)</Button>
            </div>
          </Card>
        )}

        {state === "done" && (
          <Card className="bg-slate-900/80 border-emerald-800/40 p-6 text-center space-y-3">
            <Trophy className="w-16 h-16 mx-auto text-amber-300 animate-pulse" />
            <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
            <div className="flex gap-2">
              <Button onClick={() => selected && start(selected)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500">Again</Button>
              <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
