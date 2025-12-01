import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Beat {
  id: number;
  lane: number;
  position: number;
}

export default function RhythmRush() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [round, setRound] = useState(1);
  const [gameFinished, setGameFinished] = useState(false);
  const nextBeatId = useRef(0);
  const beatInterval = useRef<NodeJS.Timeout | null>(null);
  const moveInterval = useRef<NodeJS.Timeout | null>(null);

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
        sessionStorage.removeItem('bullWorldAccess'); // One-time use
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
    setBeats([]);
    setScore(0);
    setCombo(0);
    setRound(1);

    // Spawn beats
    beatInterval.current = setInterval(() => {
      const lane = Math.floor(Math.random() * 4);
      setBeats(prev => [...prev, { id: nextBeatId.current++, lane, position: 0 }]);
    }, 800 - (round * 50));

    // Move beats down
    moveInterval.current = setInterval(() => {
      setBeats(prev => {
        const updated = prev.map(b => ({ ...b, position: b.position + 2 }));
        // Remove missed beats (position > 100)
        const missed = updated.filter(b => b.position > 100);
        if (missed.length > 0) {
          setCombo(0);
          toast.error("Miss!");
        }
        return updated.filter(b => b.position <= 100);
      });
    }, 50);
  };

  useEffect(() => {
    return () => {
      if (beatInterval.current) clearInterval(beatInterval.current);
      if (moveInterval.current) clearInterval(moveInterval.current);
    };
  }, []);

  const hitBeat = (lane: number) => {
    const targetZone = beats.filter(b => b.lane === lane && b.position >= 85 && b.position <= 95);
    if (targetZone.length > 0) {
      const hit = targetZone[0];
      setBeats(prev => prev.filter(b => b.id !== hit.id));
      const points = 10 + combo;
      setScore(s => s + points);
      setCombo(c => c + 1);
      toast.success(`Perfect! +${points} (Combo: ${combo + 1})`);

      // Check round progression
      if (score + points >= round * 100) {
        if (round >= 10) {
          endGame();
        } else {
          setRound(r => r + 1);
          toast.info(`Round ${round + 1}!`);
        }
      }
    } else {
      setCombo(0);
      toast.error("Miss!");
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);
    if (beatInterval.current) clearInterval(beatInterval.current);
    if (moveInterval.current) clearInterval(moveInterval.current);

    const diamonds = Math.floor(score / 10);
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
            Rhythm Rush Complete!
          </h2>
          <p className="text-xl">Final Score: {score}</p>
          <p className="text-xl">Max Combo: {combo}</p>
          <p className="text-xl">Diamonds Earned: {totalDiamonds} 💎</p>
          <Button onClick={() => {
            const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
            sessionStorage.removeItem('fromBullWorld');
            navigate(fromBullWorld ? "/games/bull-world" : "/dashboard");
          }} size="lg">
            {sessionStorage.getItem('fromBullWorld') === 'true' ? "Return to Bull World" : "Return to Dashboard"}
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
              🎵 Rhythm Rush
            </h1>
            <Button onClick={() => endGame()} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Round</p>
              <p className="text-2xl font-bold">{round}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{score}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Combo</p>
              <p className="text-2xl font-bold">{combo}x</p>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative h-96 bg-gradient-to-b from-primary/20 to-background border-2 border-primary/40 rounded-lg overflow-hidden">
            {/* Target Zone */}
            <div className="absolute bottom-16 left-0 right-0 h-10 bg-primary/30 border-y-2 border-primary z-10" />
            
            {/* Lanes */}
            <div className="flex h-full">
              {[0, 1, 2, 3].map(lane => (
                <div key={lane} className="flex-1 border-r border-primary/20 relative">
                  {beats.filter(b => b.lane === lane).map(beat => (
                    <div
                      key={beat.id}
                      className="absolute left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-primary to-primary/60 rounded-full shadow-lg"
                      style={{ top: `${beat.position}%` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(lane => (
              <Button
                key={lane}
                onClick={() => hitBeat(lane)}
                size="lg"
                className="h-16"
              >
                Lane {lane + 1}
              </Button>
            ))}
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Hit the beats when they reach the target zone! Build combos for bonus points!
          </p>
        </div>
      </Card>
    </div>
  );
}
