import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Coins, Crown } from "lucide-react";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.5, epic: 2, legendary: 3 };
const RARITY_COLOR: Record<string, string> = {
  common: "from-slate-600 to-slate-800 border-slate-400/40",
  rare: "from-blue-600 to-indigo-800 border-blue-400/50",
  epic: "from-purple-600 to-fuchsia-800 border-purple-400/50",
  legendary: "from-amber-500 to-rose-700 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.35)]",
};

interface NftRow { nft_id: string; nft_name: string; rarity: string; level: number; image?: string; }

const CsbNftPower = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { bullsOwned, highestRarity, nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, spendBalance } = useCsbv1();
  const [nfts, setNfts] = useState<NftRow[]>([]);

  const load = async () => {
    if (!userId) return;
    const { data } = await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id");
    const existing = (data || []) as any[];
    const existingIds = new Set(existing.map((r) => r.nft_id));

    // Prefer seeding from real wallet NFTs (with images); fall back to bull count
    const toInsert: any[] = [];
    if (walletNfts && walletNfts.length > 0) {
      walletNfts.forEach((wn, i) => {
        const id = wn.assetNameHex ? `csb_${wn.assetNameHex}` : `bull_${i + 1}`;
        if (!existingIds.has(id)) {
          toInsert.push({
            user_id: userId, nft_id: id,
            nft_name: wn.name || `CSB Bull #${i + 1}`,
            rarity: i === 0 ? (highestRarity === "none" ? "common" : highestRarity) : "common",
            level: 1,
          });
        }
      });
    } else {
      for (let i = 0; i < bullsOwned; i++) {
        const id = `bull_${i + 1}`;
        if (!existingIds.has(id)) {
          toInsert.push({
            user_id: userId, nft_id: id,
            nft_name: `CSB Bull #${i + 1}`,
            rarity: i === 0 ? (highestRarity === "none" ? "common" : highestRarity) : "common",
            level: 1,
          });
        }
      }
    }
    if (toInsert.length) {
      await supabase.from("csbv1_nft_power" as any).insert(toInsert);
    }
    const refetch = await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id");
    const rows = (refetch.data || []) as any[];
    // Attach images from wallet scan by matching nft_id (csb_<hex>) or by name
    const merged = rows.map((r) => {
      const match = walletNfts?.find((w) =>
        (w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`) || w.name === r.nft_name
      );
      return { ...r, image: match?.image } as NftRow;
    });
    setNfts(merged);
  };
  useEffect(() => { load(); }, [userId, bullsOwned, walletNfts.length]);

  const upgradeNft = async (nft: NftRow) => {
    if (!userId || !player) return;
    const cost = Math.floor(50 * Math.pow(1.5, nft.level));
    if (player.balance < cost) { toast({ title: "Not enough $CsBv1", variant: "destructive" }); return; }
    const ok = await spendBalance(cost);
    if (!ok) return;
    await supabase.from("csbv1_nft_power" as any)
      .update({ level: nft.level + 1 })
      .eq("user_id", userId).eq("nft_id", nft.nft_id);
    toast({ title: `${nft.nft_name} → Lv ${nft.level + 1}`, description: `+${(0.1).toFixed(2)}x multiplier` });
    load();
  };

  const totalMultiplier = nfts.reduce((acc, n) => acc + (RARITY_BASE[n.rarity] || 1) * (1 + (n.level - 1) * 0.1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/csb")} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>

        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">NFT POWER</h1>
          <p className="text-sm text-muted-foreground mt-1">Total power: x{totalMultiplier.toFixed(2)} · {nfts.length} NFTs</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-amber-300">
            <Coins className="w-4 h-4" /> {player?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        {nfts.length === 0 ? (
          <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No CSB Bull NFTs detected. Hold a bull to unlock NFT Power.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nfts.map((n) => {
              const base = RARITY_BASE[n.rarity] || 1;
              const mult = base * (1 + (n.level - 1) * 0.1);
              const cost = Math.floor(50 * Math.pow(1.5, n.level));
              const can = (player?.balance || 0) >= cost;
              return (
                <Card key={n.nft_id} className={`p-4 bg-gradient-to-br ${RARITY_COLOR[n.rarity] || RARITY_COLOR.common} border-2`}>
                  <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-3 overflow-hidden ring-1 ring-white/10">
                    {n.image ? (
                      <img
                        src={n.image}
                        alt={n.nft_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : n.rarity === "legendary" ? (
                      <Crown className="w-12 h-12 text-amber-300" />
                    ) : (
                      <Sparkles className="w-12 h-12 opacity-80" />
                    )}
                  </div>
                  <div className="text-xs uppercase tracking-wider opacity-80">{n.rarity}</div>
                  <h3 className="font-bold text-sm truncate">{n.nft_name}</h3>
                  <div className="text-xs opacity-90 my-1">Lv {n.level} · x{mult.toFixed(2)}</div>
                  <Button size="sm" className="w-full mt-2" disabled={!can} onClick={() => upgradeNft(n)}>
                    <Coins className="w-3 h-3 mr-1" /> {cost}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CsbNftPower;
