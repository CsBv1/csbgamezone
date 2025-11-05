import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Skull, Heart, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EternalArena = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bossPhase, setBossPhase] = useState(1);
  const [bossHealth, setBossHealth] = useState(100);
  const [playerHealth, setPlayerHealth] = useState(100);
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
    setBossPhase(1);
    setBossHealth(100);
    setPlayerHealth(100);
    setDiamonds(0);
    setPlaying(false);
    
    toast.success("⚔️ Enter the Eternal Arena!");
  };

  const attack = async () => {
    setPlaying(true);
    
    setTimeout(async () => {
      const damage = Math.floor(Math.random() * 25) + 15;
      const newBossHealth = Math.max(0, bossHealth - damage);
      setBossHealth(newBossHealth);
      
      toast.success(`⚔️ Hit for ${damage} damage!`);
      
      if (newBossHealth <= 0) {
        if (bossPhase < 5) {
          const phaseReward = 30000 * bossPhase;
          setDiamonds(prev => prev + phaseReward);
          setBossPhase(prev => prev + 1);
          setBossHealth(100);
          toast.success(`🎉 Phase ${bossPhase} defeated! +${phaseReward.toLocaleString()} 💎`);
        } else {
          const finalReward = 200000;
          setDiamonds(prev => prev + finalReward);
          toast.success(`👑 Boss defeated! +${finalReward.toLocaleString()} 💎`);
          await claimRewards(diamonds + finalReward);
        }
      } else {
        // Boss counterattack
        const counterDamage = Math.floor(Math.random() * 20) + 10 + (bossPhase * 5);
        const newPlayerHealth = Math.max(0, playerHealth - counterDamage);
        setPlayerHealth(newPlayerHealth);
        
        if (newPlayerHealth <= 0) {
          toast.error("💀 Defeated in battle!");
          await claimRewards(diamonds);
        } else {
          toast.error(`💥 Boss hit you for ${counterDamage} damage!`);
        }
      }
      
      setPlaying(false);
    }, 1200);
  };

  const defend = async () => {
    setPlaying(true);
    
    setTimeout(() => {
      const healAmount = Math.floor(Math.random() * 15) + 10;
      setPlayerHealth(prev => Math.min(100, prev + healAmount));
      
      const reducedDamage = Math.floor(Math.random() * 8) + 3;
      setPlayerHealth(prev => Math.max(0, prev - reducedDamage));
      
      toast.info(`🛡️ Defended! Healed ${healAmount}, took ${reducedDamage} damage`);
      setPlaying(false);
    }, 1000);
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

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            ⚔️ Eternal Arena
          </h1>
          <p className="text-muted-foreground">Battle the legendary boss through 5 phases!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Phase: {bossPhase}/5</div>
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
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="flex items-center gap-2 text-red-500">
                    <Skull className="w-5 h-5" />
                    Boss Phase {bossPhase}
                  </span>
                  <span>{bossHealth}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-red-600 to-orange-600 h-4 rounded-full transition-all"
                    style={{ width: `${bossHealth}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="flex items-center gap-2 text-green-500">
                    <Heart className="w-5 h-5" />
                    Your Health
                  </span>
                  <span>{playerHealth}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-4 rounded-full transition-all"
                    style={{ width: `${playerHealth}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-500">Phase {bossPhase}</div>
                <div className="text-xs text-muted-foreground">Current Phase</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={attack} 
                disabled={playing || playerHealth <= 0} 
                size="lg" 
                className="flex-col h-24 bg-gradient-to-r from-red-600 to-orange-600"
              >
                <Zap className="w-6 h-6 mb-2" />
                <span>Attack</span>
                <span className="text-xs">15-40 damage</span>
              </Button>
              <Button 
                onClick={defend} 
                disabled={playing || playerHealth <= 0} 
                size="lg" 
                variant="outline"
                className="flex-col h-24 bg-green-500/10 border-green-500/50"
              >
                <Heart className="w-6 h-6 mb-2" />
                <span>Defend</span>
                <span className="text-xs">Heal + Block</span>
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

export default EternalArena;
