import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Brain } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PatternMaster = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [showingPattern, setShowingPattern] = useState(false);
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [autoStarting, setAutoStarting] = useState(true);
  const [readyToPlay, setReadyToPlay] = useState(false);

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
 
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
    setLevel(1);
    setDiamonds(0);
    setPlaying(false);
    
    toast.success("🧠 Pattern Master begins!");
    generatePattern(1);
  };

  const generatePattern = (lvl: number) => {
    const length = Math.min(3 + lvl, 12);
    const newPattern = Array.from({ length }, () => Math.floor(Math.random() * 6));
    setPattern(newPattern);
    setUserPattern([]);
    setReadyToPlay(false);
    showPattern(newPattern);
  };

  const showPattern = async (pat: number[]) => {
    setShowingPattern(true);
    toast.info("👀 Watch the pattern!");
    
    for (let i = 0; i < pat.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const buttons = document.querySelectorAll('.pattern-button');
      buttons[pat[i]].classList.add('ring-4', 'ring-white');
      await new Promise(resolve => setTimeout(resolve, 500));
      buttons[pat[i]].classList.remove('ring-4', 'ring-white');
    }
    
    setShowingPattern(false);
    setReadyToPlay(true);
    toast.success("Your turn!");
  };

  const handleColorClick = (index: number) => {
    if (!readyToPlay || showingPattern) return;
    
    const newUserPattern = [...userPattern, index];
    setUserPattern(newUserPattern);
    
    const correct = pattern[newUserPattern.length - 1] === index;
    
    if (!correct) {
      toast.error(`❌ Wrong! Failed at level ${level}`);
      claimRewards(diamonds);
      return;
    }
    
    if (newUserPattern.length === pattern.length) {
      const reward = 15000 * level;
      setDiamonds(prev => prev + reward);
      toast.success(`✅ Level ${level} complete! +${reward.toLocaleString()} 💎`);
      
      if (level >= 15) {
        const bonus = 300000;
        setDiamonds(prev => prev + bonus);
        toast.success(`🏆 Perfect memory! +${bonus.toLocaleString()} bonus!`);
        claimRewards(diamonds + reward + bonus);
      } else {
        setTimeout(() => {
          setLevel(prev => prev + 1);
          generatePattern(level + 1);
        }, 1500);
      }
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
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🧠 Pattern Master
          </h1>
          <p className="text-muted-foreground">Watch and repeat the pattern - test your memory!</p>
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
              <div className="inline-block p-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full border-4 border-cyan-500">
                <Brain className="w-20 h-20 text-cyan-500" />
              </div>
              <h2 className="text-3xl font-bold mt-4 text-cyan-500">
                Level {level}
              </h2>
              <p className="text-muted-foreground">Pattern length: {pattern.length}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{userPattern.length}/{pattern.length}</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorClick(index)}
                  disabled={!readyToPlay || showingPattern}
                  className={`pattern-button h-24 rounded-lg ${color} transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              ))}
            </div>

            <div className="text-center">
              {showingPattern && <p className="text-lg text-yellow-500">👀 Watch carefully...</p>}
              {readyToPlay && <p className="text-lg text-green-500">✋ Your turn! Tap the pattern</p>}
            </div>

            <Button 
              onClick={() => claimRewards(diamonds)} 
              disabled={showingPattern || diamonds === 0} 
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

export default PatternMaster;
