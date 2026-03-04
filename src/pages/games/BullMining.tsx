import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pickaxe, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const BullMining = () => {
  const navigate = useNavigate();
  const { credits, diamonds, awardDiamonds, awardCredits, deductCredits, loading } = useGameLogic("Bull Mining");
  const [bulls, setBulls] = useState(1);
  const [miningProgress, setMiningProgress] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [totalMined, setTotalMined] = useState({ diamonds: 0, credits: 0 });
  const [pendingReward, setPendingReward] = useState<{ diamonds: number; credits: number } | null>(null);

  const bullCost = 100;
  const miningSpeed = bulls * 2;

  const buyBull = async () => {
    if (bulls >= 100 || loading) return;
    const paid = await deductCredits(bullCost);
    if (paid) {
      setBulls(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!isMining) return;

    const interval = setInterval(() => {
      setMiningProgress(prev => {
        const newProgress = prev + miningSpeed;

        if (newProgress >= 100) {
          const diamondsEarned = Math.floor(Math.random() * bulls * 12) + bulls * 5;
          const creditsEarned = Math.floor(Math.random() * bulls) + 1;
          setPendingReward({ diamonds: diamondsEarned, credits: creditsEarned });
          return newProgress - 100;
        }

        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isMining, bulls, miningSpeed]);

  useEffect(() => {
    if (!pendingReward) return;

    const applyReward = async () => {
      await awardDiamonds(pendingReward.diamonds);
      await awardCredits(pendingReward.credits);
      setTotalMined(prev => ({
        diamonds: prev.diamonds + pendingReward.diamonds,
        credits: prev.credits + pendingReward.credits
      }));
      setPendingReward(null);
    };

    applyReward();
  }, [pendingReward]);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🐂 Bull Mining Idle
          </h1>
          <p className="text-muted-foreground">Your bulls work together to mine diamonds and credits!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-2xl font-bold text-primary">💰 {credits}</div>
            <div className="text-2xl font-bold text-accent">💎 {diamonds}</div>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Mining Bulls" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-primary/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pickaxe className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">Mining Bulls: {bulls}</span>
              </div>
              <Button onClick={buyBull} disabled={credits < bullCost || bulls >= 100 || loading}>
                Buy Bull ({bullCost} 💰) - {bulls}/100
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>Mining Speed: {miningSpeed}/s</span>
                <span>{Math.floor(miningProgress)}%</span>
              </div>
              <Progress value={miningProgress} className="h-4" />
            </div>

            <Button 
              onClick={() => setIsMining(!isMining)} 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {isMining ? "⏸ Pause Mining" : "▶ Start Mining"}
            </Button>
          </Card>

          <Card className="p-6 bg-accent/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Total Mined This Session
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">💎 {totalMined.diamonds}</div>
                <div className="text-sm text-muted-foreground">Diamonds</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">💰 {totalMined.credits}</div>
                <div className="text-sm text-muted-foreground">Credits</div>
              </div>
            </div>
          </Card>

          <div className="text-center text-muted-foreground">
            <p>💡 Buy more bulls to mine faster!</p>
            <p>Each bull increases your mining speed and earnings</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BullMining;
