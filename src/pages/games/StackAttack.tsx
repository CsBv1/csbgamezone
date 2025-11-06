import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function StackAttack() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [level, setLevel] = useState(1);
  const [stack, setStack] = useState<number[]>([50]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    const fetchUserDataAndStart = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first!");
        navigate("/dashboard");
        return;
      }

      setUserId(user.id);

      const { data: keysData } = await supabase
        .from('user_keys' as any)
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!keysData || (keysData as any).balance < 1) {
        toast.error("You need a key to enter! 🔑");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      // Deduct key
      const { error: keyError } = await supabase
        .from('user_keys' as any)
        .update({ balance: (keysData as any).balance - 1 })
        .eq('user_id', user.id);

      if (keyError) {
        toast.error("Failed to use key!");
        navigate("/dashboard");
        return;
      }

      toast.success("Key used! Game starting...");
      setGameActive(true);
      setLevel(1);
      setStack([50]);
      setCurrentPosition(0);
      setDirection(1);
      setTotalDiamonds(0);
      setGameFinished(false);
      setAutoStarting(false);
    };

    fetchUserDataAndStart();
  }, []);

  useEffect(() => {
    if (!gameActive || gameFinished) return;

    const interval = setInterval(() => {
      setCurrentPosition((prev) => {
        const newPos = prev + direction * (2 + level * 0.5);
        if (newPos <= 0 || newPos >= 100) {
          setDirection((d) => -d);
        }
        return Math.max(0, Math.min(100, newPos));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameActive, gameFinished, direction, level]);

  const placeBlock = async () => {
    if (!gameActive || gameFinished || !userId) return;

    const lastBlock = stack[stack.length - 1];
    const overlap = Math.max(0, Math.min(lastBlock, 100 - Math.abs(currentPosition - (50 - lastBlock / 2))));

    if (overlap < 5) {
      setGameActive(false);
      setGameFinished(true);
      await awardDiamonds(totalDiamonds);
      toast.success(`Game Over! Reached level ${level}. Earned ${totalDiamonds} 💎`);
      return;
    }

    const diamondsEarned = Math.floor(level * 2);
    setTotalDiamonds((prev) => prev + diamondsEarned);
    setStack([...stack, overlap]);
    setLevel((l) => l + 1);
    setCurrentPosition(50);

    if (level === 20) {
      setGameActive(false);
      setGameFinished(true);
      const bonus = 100;
      const finalDiamonds = totalDiamonds + diamondsEarned + bonus;
      await awardDiamonds(finalDiamonds);
      toast.success(`Victory! Completed all 20 levels! Earned ${finalDiamonds} 💎 (Bonus: ${bonus})`);
    }
  };

  const awardDiamonds = async (amount: number) => {
    if (!userId || amount <= 0) return;

    try {
      const { data: currentData } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (!currentData) return;

      const newBalance = (currentData as any).balance + amount;
      const newTotal = (currentData as any).total_earned + amount;

      await supabase
        .from('user_diamonds' as any)
        .update({ 
          balance: newBalance,
          total_earned: newTotal 
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error awarding diamonds:', error);
    }
  };

  if (autoStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar />
        <Card className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-xl">Loading game...</p>
        </Card>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar />
        <Card className="max-w-4xl mx-auto p-8 text-center space-y-6">
          <h2 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
            Run Finished!
          </h2>
          <p className="text-xl">Level Reached: {level}</p>
          <p className="text-xl">Total Diamonds: {totalDiamonds} 💎</p>
          <p className="text-muted-foreground">Thanks for playing!</p>
          <Button onClick={() => navigate("/dashboard")} size="lg">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <CreditBar />
      
      <Card className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
              Stack Attack
            </h1>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Level</p>
              <p className="text-2xl font-bold">{level}/20</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diamonds</p>
              <p className="text-2xl font-bold">{totalDiamonds} 💎</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stack Height</p>
              <p className="text-2xl font-bold">{stack.length}</p>
            </div>
          </div>

          <div className="relative h-96 bg-card/50 border-2 border-primary/30 rounded-lg overflow-hidden">
            {/* Stack of blocks */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full">
              {stack.map((width, idx) => (
                <div
                  key={idx}
                  className="mx-auto bg-gradient-to-r from-primary to-primary-glow border-2 border-primary"
                  style={{
                    width: `${width}%`,
                    height: '20px',
                    marginBottom: '2px'
                  }}
                />
              ))}
            </div>

            {/* Current moving block */}
            {gameActive && (
              <div
                className="absolute bg-gradient-to-r from-yellow-500 to-orange-500 border-2 border-yellow-400"
                style={{
                  width: `${stack[stack.length - 1]}%`,
                  height: '20px',
                  left: `${currentPosition}%`,
                  bottom: `${stack.length * 22}px`,
                  transform: 'translateX(-50%)',
                  transition: 'left 0.05s linear'
                }}
              />
            )}
          </div>

          <Button
            onClick={placeBlock}
            size="lg"
            className="w-full"
            disabled={!gameActive}
          >
            Place Block
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Stack 20 blocks to win! Careful alignment earns more diamonds.
          </p>
        </div>
      </Card>
    </div>
  );
}
