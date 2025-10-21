import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";

const MegaBull = () => {
  const navigate = useNavigate();
  const { credits, loading, deductCredits, awardCredits, recordLoss } = useGameLogic("Mega Bull");
  const [playing, setPlaying] = useState(false);

  const playGame = async () => {
    const success = await deductCredits(20);
    if (!success) return;
    
    setPlaying(true);
    
    setTimeout(async () => {
      const multiplier = Math.random() * 3;
      if (multiplier > 1) {
        const winAmount = Math.floor(20 * multiplier);
        await awardCredits(winAmount);
      } else {
        await recordLoss(20);
      }
      setPlaying(false);
    }, 1500);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="mt-6 p-8 bg-card/95 backdrop-blur-sm">
          <div className="text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Mega Bull 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Go for the mega multiplier!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 20}
            >
              {playing ? "Spinning..." : "Play (20 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MegaBull;
