import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Rocket, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CosmicGauntlet = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

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
          setKeys((keysData as any).balance);
          // Auto-start game
          if ((keysData as any).balance >= 1) {
            startGameAuto(user.id, (keysData as any).balance);
          } else {
            toast.error("You need a key to enter! 🔑");
            setTimeout(() => navigate("/dashboard"), 2000);
          }
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
    setLevel(1);
    setDiamonds(0);
    setMultiplier(1);
    setPlaying(false);
    
    toast.success("🚀 Cosmic journey begins!");
  };

  const playLevel = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const success = Math.random() > 0.35; // 65% win rate
      
      if (success) {
        const reward = Math.floor(20000 * multiplier * level);
        setDiamonds(prev => prev + reward);
        setLevel(prev => prev + 1);
        setMultiplier(prev => prev + 0.2);
        toast.success(`⭐ Level ${level} cleared! +${reward.toLocaleString()} 💎`);
        
        if (level >= 15) {
          toast.success("🏆 Cosmic Gauntlet conquered!");
          await claimRewards(diamonds + reward);
        }
      } else {
        toast.error(`💥 Failed at level ${level}!`);
        await claimRewards(diamonds);
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
      
      toast.success(`💎 Claimed ${totalDiamonds.toLocaleString()} diamonds!`);
    }
    
    setGameActive(false);
    setLevel(0);
    setDiamonds(0);
    setMultiplier(1);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🚀 Cosmic Gauntlet
          </h1>
          <p className="text-muted-foreground">Navigate through space and collect cosmic rewards!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Level: {level}/15</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
                <span>•</span>
                <div>x{multiplier.toFixed(1)}</div>
              </>
            )}
          </div>
        </div>

        {!gameActive ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">Loading game...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full border-4 border-purple-500">
                <Rocket className="w-20 h-20 text-purple-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 gradient-gold bg-clip-text text-transparent">
                Level {level} of 15
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">x{multiplier.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Multiplier</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{15 - level + 1}</div>
                <div className="text-xs text-muted-foreground">Levels Left</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={playLevel} 
                disabled={playing} 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-700"
              >
                {playing ? "🚀 Navigating..." : "🚀 Navigate Level"}
              </Button>
              <Button 
                onClick={() => claimRewards(diamonds)} 
                disabled={playing || diamonds === 0} 
                size="lg" 
                variant="outline"
                className="flex-1"
              >
                <Star className="w-5 h-5 mr-2" />
                Claim & Exit
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CosmicGauntlet;
