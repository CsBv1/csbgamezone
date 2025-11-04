import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Coins, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FortuneTrial = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [streak, setStreak] = useState(0);

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
        
        if (keysData) setKeys((keysData as any).balance);
      }
    };
    
    fetchUserData();
  }, []);

  const startGame = async () => {
    if (keys < 1) {
      toast.error("You need a key to enter! 🔑");
      return;
    }

    if (!userId) {
      toast.error("Please connect your wallet!");
      return;
    }

    setPlaying(true);
    
    const { error: keyError } = await supabase
      .from('user_keys' as any)
      .update({ balance: keys - 1 })
      .eq('user_id', userId);
    
    if (keyError) {
      toast.error("Failed to use key!");
      setPlaying(false);
      return;
    }
    
    setKeys(prev => prev - 1);
    setGameActive(true);
    setRound(1);
    setDiamonds(0);
    setStreak(0);
    
    toast.success("🎲 Fortune's Trial begins!");
  };

  const takeLowRisk = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const success = Math.random() > 0.2; // 80% win rate
      
      if (success) {
        const reward = 15000 + (streak * 5000);
        setDiamonds(prev => prev + reward);
        setStreak(prev => prev + 1);
        setRound(prev => prev + 1);
        toast.success(`✅ Safe bet! +${reward.toLocaleString()} 💎`);
        
        if (round >= 8) {
          toast.success("🏆 Trial completed safely!");
          await claimRewards(diamonds + reward);
        }
      } else {
        toast.error(`❌ Lost at round ${round}!`);
        await claimRewards(diamonds);
      }
      
      setPlaying(false);
    }, 1500);
  };

  const takeHighRisk = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const success = Math.random() > 0.5; // 50% win rate
      
      if (success) {
        const reward = 50000 + (streak * 15000);
        setDiamonds(prev => prev + reward);
        setStreak(prev => prev + 2);
        setRound(prev => prev + 1);
        toast.success(`🔥 High risk pays off! +${reward.toLocaleString()} 💎`);
        
        if (round >= 8) {
          toast.success("🏆 Trial completed with glory!");
          await claimRewards(diamonds + reward);
        }
      } else {
        toast.error(`💥 High risk failed at round ${round}!`);
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
    setRound(0);
    setDiamonds(0);
    setStreak(0);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🎲 Fortune's Trial
          </h1>
          <p className="text-muted-foreground">Risk vs Reward - Choose wisely!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Round: {round}/8</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
                <span>•</span>
                <div>🔥 {streak}</div>
              </>
            )}
          </div>
        </div>

        {!gameActive ? (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg border-2 border-amber-500/50">
              <h3 className="text-xl font-bold mb-4 text-center">Game Rules</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Requires 1 🔑 to enter</li>
                <li>• 8 rounds to complete</li>
                <li>• Each round: choose Low Risk or High Risk</li>
                <li>• Low Risk: 80% win, 15K base + streak bonus</li>
                <li>• High Risk: 50% win, 50K base + streak bonus</li>
                <li>• Streak multiplier increases rewards</li>
                <li>• Keep earned diamonds if you fail</li>
              </ul>
            </div>

            <Button 
              onClick={startGame} 
              disabled={playing || keys < 1} 
              size="lg" 
              className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800"
            >
              {keys < 1 ? "Need Key 🔑" : "Begin Trial (1 🔑)"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full border-4 border-amber-500">
                <TrendingUp className="w-20 h-20 text-amber-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 gradient-gold bg-clip-text text-transparent">
                Round {round} of 8
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-amber-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-500">🔥 {streak}</div>
                <div className="text-xs text-muted-foreground">Streak Bonus</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{8 - round + 1}</div>
                <div className="text-xs text-muted-foreground">Rounds Left</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={takeLowRisk} 
                disabled={playing} 
                size="lg" 
                variant="outline"
                className="flex-col h-24 bg-green-500/10 border-green-500/50 hover:bg-green-500/20"
              >
                <Coins className="w-6 h-6 mb-2" />
                <span>Low Risk</span>
                <span className="text-xs">80% win</span>
              </Button>
              <Button 
                onClick={takeHighRisk} 
                disabled={playing} 
                size="lg" 
                variant="outline"
                className="flex-col h-24 bg-red-500/10 border-red-500/50 hover:bg-red-500/20"
              >
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>High Risk</span>
                <span className="text-xs">50% win</span>
              </Button>
            </div>

            <Button 
              onClick={() => claimRewards(diamonds)} 
              disabled={playing || diamonds === 0} 
              size="lg" 
              variant="outline"
              className="w-full"
            >
              Claim {diamonds.toLocaleString()} 💎 & Exit
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FortuneTrial;
