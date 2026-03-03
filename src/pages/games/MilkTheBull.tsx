import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Milk } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const MilkTheBull = () => {
  const navigate = useNavigate();
  const { credits, diamonds, awardDiamonds, awardCredits, loading } = useGameLogic("Milk The Bull");
  const [energy, setEnergy] = useState(100);
  const [milk, setMilk] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const milkClick = () => {
    if (energy >= 5 && !isResting) {
      setEnergy(prev => Math.max(0, prev - 5));
      const milkGained = Math.floor(Math.random() * 3) + 1 + Math.floor(streak / 5);
      setMilk(prev => prev + milkGained);
      setStreak(prev => prev + 1);
    }
  };

  const rest = () => {
    setIsResting(true);
    const interval = setInterval(() => {
      setEnergy(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsResting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const sellMilk = async () => {
    if (milk > 0) {
      const diamondsEarned = Math.floor(milk / 3);
      const creditsEarned = milk * 2;
      
      if (diamondsEarned > 0) await awardDiamonds(diamondsEarned);
      if (creditsEarned > 0) await awardCredits(creditsEarned);
      
      setMilk(0);
      setStreak(0);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🥛 Milk The Bull
          </h1>
          <p className="text-muted-foreground">Click to milk! Build streaks for bonus milk!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-2xl font-bold text-primary">💰 {credits}</div>
            <div className="text-2xl font-bold text-accent">💎 {diamonds}</div>
          </div>
        </div>

        <div 
          className="mb-6 flex justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          onClick={milkClick}
        >
          <img 
            src={holyBull} 
            alt="Bull to Milk" 
            className="w-48 h-48 object-cover rounded-full border-4 border-primary shadow-lg" 
          />
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-primary/10">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Energy</span>
                  <span>{energy}/100</span>
                </div>
                <Progress value={energy} className="h-3" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Milk className="w-6 h-6 inline mr-2" />
                  <span className="text-xl font-bold">Milk: {milk}</span>
                </div>
                <div className="text-sm">
                  🔥 Streak: {streak}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={rest} 
                  disabled={isResting || energy === 100}
                  variant="outline"
                >
                  {isResting ? "Resting..." : "Rest (+10/0.5s)"}
                </Button>
                <Button 
                  onClick={sellMilk} 
                  disabled={milk === 0 || loading}
                >
                  Sell Milk
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-accent/10">
            <h3 className="text-lg font-bold mb-3">Rewards</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-accent">💎 {Math.floor(milk / 3)}</div>
                <div className="text-sm text-muted-foreground">Diamonds (3 milk = 1 💎)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">💰 {milk * 2}</div>
                <div className="text-sm text-muted-foreground">Credits (1 milk = 2 💰)</div>
              </div>
            </div>
          </Card>

          <div className="text-center text-muted-foreground">
            <p>💡 Click the bull to milk!</p>
            <p>Build streaks for bonus milk production</p>
            <p>Rest to recover energy when needed</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MilkTheBull;
