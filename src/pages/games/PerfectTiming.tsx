import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PerfectTiming = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [combo, setCombo] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [autoStarting, setAutoStarting] = useState(true);
  const [barPosition, setBarPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
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

  useEffect(() => {
    if (isActive && gameActive) {
      const speed = 8 + (round * 2);
      intervalRef.current = setInterval(() => {
        setBarPosition(prev => {
          const newPos = prev + direction;
          if (newPos >= 100 || newPos <= 0) {
            setDirection(d => -d);
          }
          return Math.max(0, Math.min(100, newPos));
        });
      }, speed);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, direction, round, gameActive]);

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
    setCombo(0);
    setDiamonds(0);
    setBarPosition(50);
    setDirection(1);
    setIsActive(true);
    setPlaying(false);
    
    toast.success("⏱️ Perfect Timing begins!");
  };

  const handleStop = () => {
    setIsActive(false);
    
    const targetZone = 45;
    const targetWidth = Math.max(10, 20 - round);
    const distance = Math.abs(barPosition - 50);
    
    if (distance <= targetWidth / 2) {
      const accuracy = 100 - (distance / (targetWidth / 2)) * 100;
      const isPerfect = distance <= 2;
      
      const newCombo = isPerfect ? combo + 2 : combo + 1;
      const baseReward = 15000;
      const comboBonus = newCombo * 3000;
      const perfectBonus = isPerfect ? 10000 : 0;
      const reward = baseReward + comboBonus + perfectBonus;
      
      setCombo(newCombo);
      setDiamonds(prev => prev + reward);
      
      if (isPerfect) {
        toast.success(`🎯 PERFECT! +${reward.toLocaleString()} 💎 (${newCombo}x combo)`);
      } else {
        toast.success(`✅ Great! +${reward.toLocaleString()} 💎 (${newCombo}x combo)`);
      }
      
      if (round >= 12) {
        const finalBonus = newCombo * 20000;
        setDiamonds(prev => prev + finalBonus);
        toast.success(`🏆 Master timing! +${finalBonus.toLocaleString()} combo bonus!`);
        claimRewards(diamonds + reward + finalBonus);
      } else {
        setTimeout(() => {
          setRound(prev => prev + 1);
          setBarPosition(50);
          setDirection(1);
          setIsActive(true);
        }, 1500);
      }
    } else {
      toast.error(`❌ Missed! Combo lost at round ${round}`);
      claimRewards(diamonds);
    }
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
    setIsActive(false);
  };

  const targetWidth = Math.max(10, 20 - round);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            ⏱️ Perfect Timing
          </h1>
          <p className="text-muted-foreground">Stop the bar in the target zone - build your combo!</p>
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
                <span>•</span>
                <div className="text-orange-500">🔥 {combo}x</div>
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
              <div className="inline-block p-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full border-4 border-orange-500">
                <Target className="w-20 h-20 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 text-orange-500">
                Round {round}
              </h2>
            </div>

            <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
              <div 
                className="absolute top-1/2 -translate-y-1/2 bg-green-500/30 border-2 border-green-500"
                style={{ 
                  left: `${50 - targetWidth / 2}%`, 
                  width: `${targetWidth}%`,
                  height: '100%'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                  TARGET
                </div>
              </div>
              
              <div 
                className="absolute top-0 h-full w-2 bg-gradient-to-b from-red-500 to-orange-500 transition-all"
                style={{ left: `${barPosition}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-500">🔥 {combo}x</div>
                <div className="text-xs text-muted-foreground">Combo</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-500">{targetWidth.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Target Size</div>
              </div>
            </div>

            <Button 
              onClick={handleStop} 
              disabled={!isActive} 
              size="lg" 
              className="w-full h-20 text-xl bg-gradient-to-r from-orange-600 to-red-600"
            >
              <Zap className="w-6 h-6 mr-2" />
              STOP!
            </Button>

            <Button 
              onClick={() => claimRewards(diamonds)} 
              disabled={isActive || diamonds === 0} 
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

export default PerfectTiming;
