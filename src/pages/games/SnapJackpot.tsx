import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SnapJackpot() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingSequence, setShowingSequence] = useState(false);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [snapStartTime, setSnapStartTime] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
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
      startNewRound(1);
      setGameActive(true);
      setRound(1);
      setTotalDiamonds(0);
      setGameFinished(false);
      setAutoStarting(false);
    };

    init();
  }, []);

  const startNewRound = (currentRound: number) => {
    const sequenceLength = 5 + currentRound;
    const newSequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * 9) + 1);
    setSequence(newSequence);
    setCurrentIndex(0);
    setShowingSequence(true);
    setReactionTime(null);

    // Show sequence
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setCurrentIndex(idx);
      if (idx >= newSequence.length) {
        clearInterval(interval);
        setShowingSequence(false);
        setSnapStartTime(Date.now());
      }
    }, 800);
  };

  const handleSnap = () => {
    if (!gameActive || showingSequence) return;

    const elapsed = snapStartTime ? Date.now() - snapStartTime : 9999;
    setReactionTime(elapsed);

    // Check for matching consecutive numbers
    let hasMatch = false;
    for (let i = 0; i < sequence.length - 1; i++) {
      if (sequence[i] === sequence[i + 1]) {
        hasMatch = true;
        break;
      }
    }

    if (hasMatch && elapsed < 2000) {
      const earned = Math.max(10, 30 - Math.floor(elapsed / 100));
      setTotalDiamonds((prev) => prev + earned);
      toast.success(`Snap! Earned ${earned} 💎 (${elapsed}ms reaction)`);

      if (round >= 15) {
        endGame();
      } else {
        setTimeout(() => startNewRound(round + 1), 1500);
        setRound((r) => r + 1);
      }
    } else if (!hasMatch) {
      toast.error("False snap! No matches in sequence.");
      endGame();
    } else {
      toast.error("Too slow!");
      endGame();
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);
    if (userId && totalDiamonds > 0) {
      const { data } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      if (data) {
        await supabase
          .from('user_diamonds' as any)
          .update({
            balance: (data as any).balance + totalDiamonds,
            total_earned: (data as any).total_earned + totalDiamonds
          })
          .eq('user_id', userId);
      }
    }
    toast.success(`Completed ${round} rounds! Earned ${totalDiamonds} 💎`);
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
          <p className="text-xl">Rounds Completed: {round}</p>
          <p className="text-xl">Total Diamonds: {totalDiamonds} 💎</p>
          {reactionTime && <p className="text-lg">Final Reaction: {reactionTime}ms</p>}
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
              Snap Jackpot
            </h1>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Round</p>
              <p className="text-2xl font-bold">{round}/15</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diamonds</p>
              <p className="text-2xl font-bold">{totalDiamonds} 💎</p>
            </div>
          </div>

          <div className="min-h-48 flex items-center justify-center">
            {showingSequence ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Watch the sequence...</p>
                <div className="text-8xl font-bold gradient-gold bg-clip-text text-transparent">
                  {currentIndex > 0 ? sequence[currentIndex - 1] : "?"}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Press SNAP if you saw matching consecutive numbers!</p>
                <Button
                  onClick={handleSnap}
                  size="lg"
                  className="text-2xl px-12 py-8"
                >
                  SNAP! ⚡
                </Button>
                {reactionTime !== null && (
                  <p className="text-sm">Reaction time: {reactionTime}ms</p>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Watch for matching consecutive numbers, then snap as fast as you can! Faster reaction = more diamonds.
          </p>
        </div>
      </Card>
    </div>
  );
}
