import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RiskVault() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [stage, setStage] = useState(1);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [safes, setSafes] = useState<boolean[]>([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [busted, setBusted] = useState(false);

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
        generateSafes();
        setGameActive(true);
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
      generateSafes();
      setGameActive(true);
      setAutoStarting(false);
    };

    init();
  }, []);

  const generateSafes = () => {
    const bombCount = Math.floor(1 + stage * 0.5);
    const newSafes = Array(9).fill(true);
    for (let i = 0; i < bombCount; i++) {
      let pos;
      do {
        pos = Math.floor(Math.random() * 9);
      } while (!newSafes[pos]);
      newSafes[pos] = false;
    }
    setSafes(newSafes);
  };

  const openSafe = (index: number) => {
    if (!gameActive) return;

    if (safes[index]) {
      const multiplier = 1 + stage * 0.5;
      setCurrentMultiplier(prev => prev * multiplier);
      toast.success(`Safe! Multiplier: ${(currentMultiplier * multiplier).toFixed(2)}x`);
      
      const newSafes = [...safes];
      newSafes[index] = false;
      setSafes(newSafes);

      // Check if all safe boxes opened
      if (newSafes.every(s => !s)) {
        if (stage >= 10) {
          cashOut();
        } else {
          setStage(s => s + 1);
          generateSafes();
          toast.info(`Stage ${stage + 1}! More risk, more reward!`);
        }
      }
    } else {
      setBusted(true);
      toast.error("BOOM! Hit a trap! All progress lost!");
      endGame(true);
    }
  };

  const cashOut = async () => {
    setGameActive(false);
    setGameFinished(true);

    const diamonds = Math.floor(100 * currentMultiplier);
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
    toast.success(`Cashed out! Earned ${diamonds} 💎`);
  };

  const endGame = (bust: boolean = false) => {
    setGameActive(false);
    setGameFinished(true);
    if (bust) {
      setTotalDiamonds(0);
      setBusted(true);
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
          <h2 className={`text-3xl font-bold ${busted ? "text-destructive" : "gradient-gold"} bg-clip-text text-transparent`}>
            {busted ? "BUSTED!" : "Risk Vault Complete!"}
          </h2>
          <p className="text-xl">Stage Reached: {stage}</p>
          <p className="text-xl">Final Multiplier: {currentMultiplier.toFixed(2)}x</p>
          <p className="text-xl">Diamonds Earned: {totalDiamonds} 💎</p>
          {busted && <p className="text-destructive">You hit a trap and lost everything!</p>}
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
              🔐 Risk Vault
            </h1>
            <Button onClick={() => cashOut()} variant="default" disabled={!gameActive}>
              Cash Out
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Stage</p>
              <p className="text-2xl font-bold">{stage}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Multiplier</p>
              <p className="text-2xl font-bold">{currentMultiplier.toFixed(2)}x</p>
            </div>
            <div>
              <p className="text-muted-foreground">Potential</p>
              <p className="text-2xl font-bold">{Math.floor(100 * currentMultiplier)} 💎</p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-b from-primary/20 to-background border-2 border-primary/40 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Button
                  key={i}
                  onClick={() => openSafe(i)}
                  variant="outline"
                  className="h-24 text-4xl"
                  disabled={!gameActive}
                >
                  🔒
                </Button>
              ))}
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-primary">
              Choose wisely! Some safes contain traps 💣
            </p>
            <p className="text-sm text-muted-foreground">
              Cash out anytime to keep your winnings, or risk it all for stage {stage + 1}!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
