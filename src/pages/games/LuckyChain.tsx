import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Link2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LuckyChain = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [chain, setChain] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
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
    setChain(0);
    setMultiplier(1.0);
    setDiamonds(0);
    setPlaying(false);
    
    toast.success("🔗 Lucky Chain begins!");
  };

  const continueChain = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const successChance = Math.max(0.3, 0.9 - (chain * 0.05));
      const success = Math.random() < successChance;
      
      if (success) {
        const newChain = chain + 1;
        const newMultiplier = 1.0 + (newChain * 0.3);
        const reward = Math.floor(20000 * newMultiplier);
        
        setChain(newChain);
        setMultiplier(newMultiplier);
        setDiamonds(prev => prev + reward);
        
        toast.success(`🔗 Chain ${newChain}! +${reward.toLocaleString()} 💎 (${newMultiplier.toFixed(1)}x)`);
        
        if (newChain >= 20) {
          const bonus = 500000;
          setDiamonds(prev => prev + bonus);
          toast.success(`🏆 Max chain! +${bonus.toLocaleString()} bonus!`);
          await claimRewards(diamonds + reward + bonus);
        }
      } else {
        toast.error(`💔 Chain broken at ${chain}!`);
        await claimRewards(diamonds);
      }
      
      setPlaying(false);
    }, 1500);
  };

  const claimRewards = async (totalDiamonds: number) => {
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
          balance: (diamondsData as any).balance + totalDiamonds,
          total_earned: (diamondsData as any).total_earned + totalDiamonds
        })
        .eq('user_id', userId);
      
      toast.success(`💎 Claimed ${totalDiamonds.toLocaleString()} diamonds!`);
    }
    
    setGameActive(false);
  };

  const getChainColor = () => {
    if (chain < 5) return "text-green-500";
    if (chain < 10) return "text-yellow-500";
    if (chain < 15) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🔗 Lucky Chain
          </h1>
          <p className="text-muted-foreground">Build your chain, multiply rewards, but don't get greedy!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div className={getChainColor()}>Chain: {chain}</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
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
              <div className="inline-block p-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border-4 border-purple-500">
                <Link2 className={`w-20 h-20 ${getChainColor()}`} />
              </div>
              <h2 className={`text-5xl font-bold mt-4 ${getChainColor()}`}>
                Chain {chain}
              </h2>
              <p className="text-2xl text-muted-foreground mt-2">{multiplier.toFixed(1)}x Multiplier</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-amber-500">{multiplier.toFixed(1)}x</div>
                <div className="text-xs text-muted-foreground">Multiplier</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{Math.max(30, 90 - chain * 5)}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={continueChain} 
                disabled={playing} 
                size="lg" 
                className="w-full h-20 text-xl bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <TrendingUp className="w-6 h-6 mr-2" />
                Continue Chain
              </Button>
              <Button 
                onClick={() => claimRewards(diamonds)} 
                disabled={playing || diamonds === 0} 
                size="lg" 
                variant="outline"
                className="w-full"
              >
                💰 Cash Out {diamonds.toLocaleString()} 💎
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>⚠️ Success rate decreases with each chain link!</p>
              <p>💡 Reach chain 20 for a massive bonus!</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LuckyChain;
