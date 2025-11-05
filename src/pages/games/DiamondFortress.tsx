import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Shield, Gem } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DiamondFortress = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [fortressHealth, setFortressHealth] = useState(100);

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
    setRound(1);
    setDiamonds(0);
    setFortressHealth(100);
    setPlaying(false);
    
    toast.success("🏰 Defending the Diamond Fortress!");
  };

  const defendRound = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const damage = Math.floor(Math.random() * 30) + 10; // 10-40 damage
      const diamondsEarned = (100 - damage) * 1000; // More defense = more diamonds
      
      const newHealth = fortressHealth - damage;
      setFortressHealth(newHealth);
      setDiamonds(prev => prev + diamondsEarned);
      
      if (newHealth <= 0) {
        toast.error(`💥 Fortress destroyed at round ${round}!`);
        await claimRewards(diamonds + diamondsEarned);
      } else {
        setRound(prev => prev + 1);
        toast.success(`🛡️ Defended! +${diamondsEarned.toLocaleString()} 💎`);
        
        if (round >= 12) {
          toast.success("🏆 Fortress defended completely!");
          await claimRewards((diamonds + diamondsEarned) * 2); // Bonus for completing
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
      
      toast.success(`💎 Claimed ${totalDiamonds.toLocaleString()} diamonds!`);
    }
    
    setGameActive(false);
    setRound(0);
    setDiamonds(0);
    setFortressHealth(100);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            💎 Diamond Fortress
          </h1>
          <p className="text-muted-foreground">Defend your fortress and collect diamonds!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Round: {round}/12</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
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
              <div className="inline-block p-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full border-4 border-cyan-500">
                <Shield className="w-20 h-20 text-cyan-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 gradient-gold bg-clip-text text-transparent">
                Round {round} of 12
              </h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Fortress Health</span>
                <span className="text-sm font-bold text-cyan-500">{fortressHealth}%</span>
              </div>
              <div className="w-full h-8 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${fortressHealth}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Diamonds Earned 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{12 - round + 1}</div>
                <div className="text-xs text-muted-foreground">Rounds Left</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={defendRound} 
                disabled={playing} 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700"
              >
                {playing ? "🛡️ Defending..." : "🛡️ Defend Round"}
              </Button>
              <Button 
                onClick={() => claimRewards(diamonds)} 
                disabled={playing || diamonds === 0} 
                size="lg" 
                variant="outline"
                className="flex-1"
              >
                <Gem className="w-5 h-5 mr-2" />
                Claim & Exit
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DiamondFortress;
