import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Trophy, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BullGauntlet = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [wave, setWave] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);

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
    
    // Deduct key
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
    setWave(1);
    setDiamonds(0);
    
    toast.success("⚔️ Battle begins! Survive the waves!");
  };

  const battleWave = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const success = Math.random() > 0.3; // 70% win rate
      const waveReward = wave * 50000; // Increasing rewards
      
      if (success) {
        setDiamonds(prev => prev + waveReward);
        setWave(prev => prev + 1);
        toast.success(`🎉 Wave ${wave} cleared! +${waveReward.toLocaleString()} 💎`);
        
        if (wave >= 10) {
          // Game completed!
          await claimRewards(diamonds + waveReward);
        }
      } else {
        toast.error(`💀 Defeated at wave ${wave}!`);
        if (diamonds > 0) {
          await claimRewards(diamonds);
        } else {
          setGameActive(false);
        }
      }
      setPlaying(false);
    }, 2000);
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
      
      toast.success(`🏆 Claimed ${totalDiamonds.toLocaleString()} diamonds!`);
    }
    
    setGameActive(false);
    setWave(0);
    setDiamonds(0);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            ⚔️ Bull Gauntlet
          </h1>
          <p className="text-muted-foreground">Battle through waves for massive rewards!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Wave: {wave}/10</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
              </>
            )}
          </div>
        </div>

        {!gameActive ? (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg border-2 border-orange-500/50">
              <h3 className="text-xl font-bold mb-4 text-center">Game Rules</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Requires 1 🔑 to enter</li>
                <li>• Battle through 10 waves of increasing difficulty</li>
                <li>• Each wave rewards more diamonds</li>
                <li>• 70% chance to win each wave</li>
                <li>• Complete all 10 waves for MASSIVE bonus</li>
                <li>• If defeated, keep earned diamonds</li>
              </ul>
            </div>

            <Button 
              onClick={startGame} 
              disabled={playing || keys < 1} 
              size="lg" 
              className="w-full bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800"
            >
              {keys < 1 ? "Need Key 🔑" : "Enter Gauntlet (1 🔑)"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full border-4 border-orange-500">
                <Swords className="w-20 h-20 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 gradient-gold bg-clip-text text-transparent">
                Wave {wave} of 10
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{wave}</div>
                <div className="text-xs text-muted-foreground">Current Wave</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-yellow-500">{(wave * 50000).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Wave Reward</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={battleWave} 
                disabled={playing} 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
              >
                {playing ? "⚔️ Fighting..." : "⚔️ Fight Wave"}
              </Button>
              <Button 
                onClick={() => claimRewards(diamonds)} 
                disabled={playing || diamonds === 0} 
                size="lg" 
                variant="outline"
                className="flex-1"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Claim & Exit
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullGauntlet;
