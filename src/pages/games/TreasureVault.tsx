import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Lock, Unlock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TreasureVault = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [chestsOpened, setChestsOpened] = useState(0);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [availableChests, setAvailableChests] = useState<number[]>([]);
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
    setChestsOpened(0);
    setTotalDiamonds(0);
    setAvailableChests(Array.from({ length: 9 }, (_, i) => i));
    setPlaying(false);
    
    toast.success("🏆 Treasure Vault unlocked! Choose wisely!");
  };

  const openChest = async (chestIndex: number) => {
    if (!availableChests.includes(chestIndex)) return;
    
    setPlaying(true);
    setAvailableChests(availableChests.filter(i => i !== chestIndex));
    
    setTimeout(async () => {
      const outcomes = [
        { type: "jackpot", diamonds: 500000, chance: 0.05 },
        { type: "mega", diamonds: 200000, chance: 0.15 },
        { type: "big", diamonds: 100000, chance: 0.25 },
        { type: "medium", diamonds: 50000, chance: 0.30 },
        { type: "small", diamonds: 25000, chance: 0.25 },
      ];
      
      const rand = Math.random();
      let cumulative = 0;
      let outcome = outcomes[outcomes.length - 1];
      
      for (const o of outcomes) {
        cumulative += o.chance;
        if (rand <= cumulative) {
          outcome = o;
          break;
        }
      }
      
      setTotalDiamonds(prev => prev + outcome.diamonds);
      setChestsOpened(prev => prev + 1);
      
      const emoji = outcome.type === "jackpot" ? "🎰" : outcome.type === "mega" ? "💰" : outcome.type === "big" ? "💎" : outcome.type === "medium" ? "💵" : "💳";
      toast.success(`${emoji} ${outcome.type.toUpperCase()}! +${outcome.diamonds.toLocaleString()} 💎`);
      
      if (chestsOpened + 1 >= 5) {
        toast.success("🏆 5 chests opened! Time to claim!");
        await claimRewards(totalDiamonds + outcome.diamonds);
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
    setChestsOpened(0);
    setTotalDiamonds(0);
    setAvailableChests([]);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🏆 Treasure Vault
          </h1>
          <p className="text-muted-foreground">Unlock chests for legendary prizes!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div>Opened: {chestsOpened}/5</div>
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
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 9 }, (_, i) => {
                const isAvailable = availableChests.includes(i);
                const isOpened = chestsOpened > 0 && !availableChests.includes(i);
                
                return (
                  <Button
                    key={i}
                    onClick={() => openChest(i)}
                    disabled={!isAvailable || playing}
                    className={`h-24 ${isOpened ? 'bg-green-500/20 border-green-500' : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50'} hover:scale-105 transition-all`}
                    variant="outline"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {isOpened ? (
                        <Unlock className="w-8 h-8 text-green-500" />
                      ) : (
                        <Lock className="w-8 h-8 text-purple-500" />
                      )}
                      <span className="text-xs">Chest {i + 1}</span>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{chestsOpened}/5</div>
                <div className="text-xs text-muted-foreground">Chests Opened</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{totalDiamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
            </div>

            {chestsOpened >= 5 && (
              <Button 
                onClick={() => claimRewards(totalDiamonds)} 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-700"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Claim {totalDiamonds.toLocaleString()} Diamonds!
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TreasureVault;
