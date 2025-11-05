import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Box, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ShadowVault = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState(1);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [boxesOpened, setBoxesOpened] = useState(0);
  const [autoStarting, setAutoStarting] = useState(true);
 
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        const { data: keysData } = await supabase
          .from('user_keys' as any)
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (keysData) {
          const balance = (keysData as any).balance;
          setKeys(balance);
          // Auto-start game
          if (balance >= 1) {
            await startGameAuto(user.id, balance);
          } else {
            toast.error("You need a key to enter! 🔑");
            setTimeout(() => navigate("/dashboard"), 2000);
          }
          setAutoStarting(false);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const startGameAuto = async (uid: string, currentKeys: number) => {
    setPlaying(true);
    
    const { error: keyError } = await supabase
      .from('user_keys' as any)
      .update({ balance: currentKeys - 1 })
      .eq('user_id', uid);
    
    if (keyError) {
      toast.error("Failed to use key!");
      setPlaying(false);
      setTimeout(() => navigate("/dashboard"), 2000);
      return;
    }
    
    setKeys(prev => prev - 1);
    setGameActive(true);
    setTier(1);
    setTotalDiamonds(0);
    setBoxesOpened(0);
    setPlaying(false);
    
    toast.success("🌑 Shadow Vault unlocked!");
  };

  const openBox = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      // Progressive reward system based on tier
      const baseReward = [10000, 25000, 50000, 100000, 250000];
      const multiplier = Math.random() * 2 + 0.5; // 0.5x to 2.5x
      const reward = Math.floor(baseReward[tier - 1] * multiplier);
      
      setTotalDiamonds(prev => prev + reward);
      setBoxesOpened(prev => prev + 1);
      
      toast.success(`📦 Tier ${tier} box! +${reward.toLocaleString()} 💎`);
      
      // After 3 boxes, move to next tier
      if ((boxesOpened + 1) % 3 === 0 && tier < 5) {
        setTier(prev => prev + 1);
        toast.info(`⬆️ Advanced to Tier ${tier + 1}!`);
      }
      
      // Complete after 15 boxes (3 per tier x 5 tiers)
      if (boxesOpened + 1 >= 15) {
        toast.success("🏆 Shadow Vault conquered!");
        await claimRewards(totalDiamonds + reward);
      }
      
      setPlaying(false);
    }, 1500);
  };

  const claimRewards = async (diamonds: number) => {
    if (!userId) return;
    
    const { data: diamondsData } = await supabase
      .from('user_diamonds' as any)
      .select('balance, total_earned')
      .eq('user_id', userId)
      .single();
    
    if (diamondsData) {
      await supabase
        .from('user_diamonds' as any)
        .update({ 
          balance: (diamondsData as any).balance + diamonds,
          total_earned: (diamondsData as any).total_earned + diamonds
        })
        .eq('user_id', userId);
      
      toast.success(`💎 Claimed ${diamonds.toLocaleString()} diamonds!`);
    }
    
    setGameActive(false);
    setTier(1);
    setTotalDiamonds(0);
    setBoxesOpened(0);
  };

  const getTierInfo = (t: number) => {
    const tiers = [
      { name: "Bronze", color: "text-amber-600", base: "10K" },
      { name: "Silver", color: "text-gray-400", base: "25K" },
      { name: "Gold", color: "text-yellow-500", base: "50K" },
      { name: "Platinum", color: "text-cyan-400", base: "100K" },
      { name: "Diamond", color: "text-purple-500", base: "250K" }
    ];
    return tiers[t - 1];
  };

  const tierInfo = getTierInfo(tier);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🌑 Shadow Vault
          </h1>
          <p className="text-muted-foreground">Progressive mystery boxes with increasing rewards!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div className={tierInfo.color}>{tierInfo.name}</div>
                <span>•</span>
                <div>Box: {boxesOpened}/15</div>
                <span>•</span>
                <div>💎 {totalDiamonds.toLocaleString()}</div>
              </>
            )}
          </div>
        </div>

        {!gameActive ? (
          autoStarting ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Loading game...</p>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <p className="text-muted-foreground">Run finished. Thanks for playing!</p>
              <Button onClick={() => navigate('/dashboard')} size="lg" variant="outline" className="mx-auto">Back to Dashboard</Button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`inline-block p-8 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full border-4 border-purple-500`}>
                <Box className={`w-20 h-20 ${tierInfo.color}`} />
              </div>
              <h2 className={`text-3xl font-bold mt-4 ${tierInfo.color}`}>
                {tierInfo.name} Tier
              </h2>
              <p className="text-muted-foreground">Base: {tierInfo.base} • Multiplier: 0.5x-2.5x</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{boxesOpened}/15</div>
                <div className="text-xs text-muted-foreground">Boxes Opened</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{totalDiamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={openBox} 
                disabled={playing} 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700"
              >
                {playing ? "📦 Opening..." : "📦 Open Box"}
              </Button>
              <Button 
                onClick={() => claimRewards(totalDiamonds)} 
                disabled={playing || totalDiamonds === 0} 
                size="lg" 
                variant="outline"
                className="flex-1"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Claim & Exit
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShadowVault;
