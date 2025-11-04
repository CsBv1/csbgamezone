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
    setLevel(1);
    setDiamonds(0);
    setMultiplier(1);
    
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
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border-2 border-purple-500/50">
              <h3 className="text-xl font-bold mb-4 text-center">Game Rules</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Requires 1 🔑 to enter</li>
                <li>• Progress through 15 levels</li>
                <li>• 65% success rate per level</li>
                <li>• Rewards increase with level & multiplier</li>
                <li>• Multiplier increases by 0.2x each level</li>
                <li>• Keep earned diamonds if you fail</li>
              </ul>
            </div>

            <Button 
              onClick={startGame} 
              disabled={playing || keys < 1} 
              size="lg" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-700 hover:from-purple-700 hover:to-blue-800"
            >
              {keys < 1 ? "Need Key 🔑" : "Launch Mission (1 🔑)"}
            </Button>
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
