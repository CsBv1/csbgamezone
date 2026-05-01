import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, TrendingUp, Sparkles, Wallet, Gift, ArrowLeft, Coins } from "lucide-react";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CLAIM_COOLDOWN_HOURS = 2;

const CsbDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet, isConnected } = useCardanoWallet();
  const { bullsOwned, highestRarity } = useNFTBonuses(connectedWallet?.address || null);
  const { player, currentEnergy, addBalance, updatePlayer, loading } = useCsbv1();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Boost level effect
  const [boostLevel, setBoostLevel] = useState(0);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("csbv1_upgrades" as any)
        .select("level").eq("user_id", user.id).eq("upgrade_type", "reward_boost").maybeSingle();
      setBoostLevel((data as any)?.level || 0);
    })();
  }, [player?.balance]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-gradient-to-br from-purple-950 to-slate-950 border-cyan-400">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2 text-cyan-400">Wallet Required</h2>
          <p className="text-muted-foreground mb-6">Connect your Cardano wallet to enter CSB Game Zone</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (loading || !player) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Sparkles className="w-12 h-12 animate-spin text-cyan-400" /></div>;
  }

  const lastClaim = player.last_claim_at ? new Date(player.last_claim_at).getTime() : 0;
  const nextClaim = lastClaim + CLAIM_COOLDOWN_HOURS * 3600 * 1000;
  const canClaim = now >= nextClaim;
  const cdRemaining = Math.max(0, nextClaim - now);
  const hours = Math.floor(cdRemaining / 3600000);
  const mins = Math.floor((cdRemaining % 3600000) / 60000);
  const secs = Math.floor((cdRemaining % 60000) / 1000);

  // NFT power level → multiplier
  const rarityMultiplier: Record<string, number> = { legendary: 3, epic: 2, rare: 1.5, common: 1, none: 1 };
  const nftMultiplier = (rarityMultiplier[highestRarity] || 1) * (1 + bullsOwned * 0.1);
  const boostMultiplier = 1 + boostLevel * 0.1;

  const baseClaim = 25;
  const claimReward = Math.floor(baseClaim * nftMultiplier * boostMultiplier);

  const handleClaim = async () => {
    if (!canClaim) return;
    await addBalance(claimReward);
    await updatePlayer({ last_claim_at: new Date().toISOString() });
    toast({
      title: `+${claimReward} $CsBv1 Claimed! 🎉`,
      description: `NFT x${nftMultiplier.toFixed(2)} · Boost x${boostMultiplier.toFixed(2)}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="text-right">
            <div className="text-xs text-cyan-400/70 font-mono">{connectedWallet?.walletName}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {connectedWallet?.address.slice(0, 8)}...{connectedWallet?.address.slice(-6)}
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
            CSB GAME ZONE
          </h1>
          <p className="text-sm text-muted-foreground">Web3 token economy · $CsBv1</p>
        </div>

        {/* Balance + Energy + NFT Power */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-amber-950/60 to-slate-950 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-2 mb-2 text-amber-400"><Coins className="w-5 h-5" /><span className="text-xs uppercase tracking-wider font-bold">Balance</span></div>
            <div className="text-3xl font-black text-amber-300">{player.balance.toLocaleString()}</div>
            <div className="text-xs text-amber-500/70 mt-1">$CsBv1</div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-cyan-950/60 to-slate-950 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="flex items-center gap-2 mb-2 text-cyan-400"><Zap className="w-5 h-5" /><span className="text-xs uppercase tracking-wider font-bold">Energy</span></div>
            <div className="text-3xl font-black text-cyan-300">{currentEnergy}<span className="text-lg text-cyan-500/70">/{player.max_energy}</span></div>
            <Progress value={(currentEnergy / player.max_energy) * 100} className="mt-2 h-2" />
            <div className="text-xs text-cyan-500/70 mt-1">+1 every minute</div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-fuchsia-950/60 to-slate-950 border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.15)]">
            <div className="flex items-center gap-2 mb-2 text-fuchsia-400"><Sparkles className="w-5 h-5" /><span className="text-xs uppercase tracking-wider font-bold">NFT Power</span></div>
            <div className="text-3xl font-black text-fuchsia-300">x{nftMultiplier.toFixed(2)}</div>
            <div className="text-xs text-fuchsia-500/70 mt-1">{bullsOwned} Bulls · {highestRarity}</div>
          </Card>
        </div>

        {/* Claim */}
        <Card className="p-8 bg-gradient-to-br from-emerald-950/60 to-slate-950 border-emerald-500/50 text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <Gift className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
          <div className="text-xs uppercase tracking-widest text-emerald-400/80 mb-1">Daily Reward</div>
          <div className="text-5xl font-black mb-2 text-emerald-300">+{claimReward} $CsBv1</div>
          <div className="text-xs text-emerald-500/70 mb-5">
            {canClaim ? "Ready to claim!" : `Next claim in ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
          </div>
          <Button
            size="lg"
            onClick={handleClaim}
            disabled={!canClaim}
            className={`w-full md:w-auto px-12 text-lg font-bold transition-all ${canClaim
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse"
              : "bg-slate-800 text-slate-500"}`}
          >
            {canClaim ? "🎁 CLAIM NOW" : "⏳ COOLDOWN"}
          </Button>
        </Card>

        {/* Nav */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NavCard onClick={() => navigate("/csb/missions")} icon={<Target className="w-8 h-8" />} title="Missions" desc="Daily challenges & streaks" color="cyan" />
          <NavCard onClick={() => navigate("/csb/upgrades")} icon={<TrendingUp className="w-8 h-8" />} title="Upgrades" desc="Boost rewards & energy" color="amber" />
          <NavCard onClick={() => navigate("/csb/nft-power")} icon={<Sparkles className="w-8 h-8" />} title="NFT Power" desc="Level up your NFTs" color="fuchsia" />
        </div>
      </div>
    </div>
  );
};

const colorMap: Record<string, string> = {
  cyan: "border-cyan-500/50 hover:border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]",
  amber: "border-amber-500/50 hover:border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]",
  fuchsia: "border-fuchsia-500/50 hover:border-fuchsia-400 text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.2)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)]",
};

const NavCard = ({ onClick, icon, title, desc, color }: { onClick: () => void; icon: React.ReactNode; title: string; desc: string; color: string }) => (
  <Card onClick={onClick} className={`p-6 cursor-pointer bg-gradient-to-br from-slate-900 to-slate-950 border-2 transition-all hover:scale-105 ${colorMap[color]}`}>
    <div className="flex items-center gap-4">
      {icon}
      <div>
        <div className="font-bold text-lg">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  </Card>
);

export default CsbDashboard;
