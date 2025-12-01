import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Target {
  id: number;
  x: number;
  y: number;
  type: "good" | "bad";
}

export default function SpeedRun() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState(1);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const nextTargetId = useRef(0);
  const spawnInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first!");
        navigate("/dashboard");
        return;
      }
      setUserId(user.id);

      // Check if coming from Bull World (free access)
      const fromBullWorld = sessionStorage.getItem('bullWorldAccess') === 'true';
      if (fromBullWorld) {
        sessionStorage.removeItem('bullWorldAccess');
        toast.success("Free play from Bull World! 🐂");
        startGame();
        setAutoStarting(false);
        return;
      }

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
      startGame();
      setAutoStarting(false);
    };

    init();
  }, []);

  const startGame = () => {
    setGameActive(true);
    setTargets([]);
    setScore(0);
    setTimeLeft(60);

    // Timer
    timerInterval.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (round >= 3) {
            endGame();
          } else {
            setRound(r => r + 1);
            toast.info(`Round ${round + 1}!`);
            return 60;
          }
        }
        return t - 1;
      });
    }, 1000);

    // Spawn targets
    spawnInterval.current = setInterval(() => {
      const x = Math.random() * 80 + 10;
      const y = Math.random() * 70 + 10;
      const type = Math.random() > 0.3 ? "good" : "bad";
      setTargets(prev => [...prev, { id: nextTargetId.current++, x, y, type }]);

      // Remove after 2 seconds
      setTimeout(() => {
        setTargets(prev => prev.filter(t => t.id !== nextTargetId.current - 1));
      }, 2000);
    }, 1000 - (round * 200));
  };

  useEffect(() => {
    return () => {
      if (spawnInterval.current) clearInterval(spawnInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  const clickTarget = (target: Target) => {
    if (target.type === "good") {
      setScore(s => s + 10 * round);
      toast.success(`+${10 * round} points!`);
    } else {
      setScore(s => Math.max(0, s - 20));
      toast.error("-20 points!");
    }
    setTargets(prev => prev.filter(t => t.id !== target.id));
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);
    if (spawnInterval.current) clearInterval(spawnInterval.current);
    if (timerInterval.current) clearInterval(timerInterval.current);

    const diamonds = Math.floor(score / 15);
    setTotalDiamonds(diamonds);

    if (userId && diamonds > 0) {
      const { data } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      if (data) {
        await supabase
          .from('user_diamonds' as any)
          .update({
            balance: (data as any).balance + diamonds,
            total_earned: (data as any).total_earned + diamonds
          })
          .eq('user_id', userId);
      }
    }
    toast.success(`Game complete! Earned ${diamonds} 💎`);
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
            Speed Run Complete!
          </h2>
          <p className="text-xl">Final Score: {score}</p>
          <p className="text-xl">Rounds Completed: {round}</p>
          <p className="text-xl">Diamonds Earned: {totalDiamonds} 💎</p>
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
              ⚡ Speed Run
            </h1>
            <Button onClick={() => endGame()} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Round</p>
              <p className="text-2xl font-bold">{round}/3</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{score}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time</p>
              <p className="text-2xl font-bold">{timeLeft}s</p>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative h-96 bg-gradient-to-br from-primary/20 to-background border-2 border-primary/40 rounded-lg overflow-hidden">
            {targets.map(target => (
              <Button
                key={target.id}
                onClick={() => clickTarget(target)}
                className={`absolute w-16 h-16 rounded-full text-2xl p-0 ${
                  target.type === "good"
                    ? "bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800"
                    : "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800"
                }`}
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  animation: "pulse 0.5s ease-in-out"
                }}
              >
                {target.type === "good" ? "💎" : "💣"}
              </Button>
            ))}
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-green-500">Click 💎 (+points)</p>
            <p className="text-lg font-bold text-red-500">Avoid 💣 (-points)</p>
            <p className="text-sm text-muted-foreground">
              Complete 3 rounds of 60 seconds each! Speed increases each round!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
