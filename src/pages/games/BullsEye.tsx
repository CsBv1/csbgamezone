import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BullsEye = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const hit = Math.floor(Math.random() * 100) + 1;
      setScore(hit);

      let winAmount = 0;
      if (hit === 100) {
        winAmount = betAmount * 20;
        toast.success(`🐂 BULLSEYE! Won ${winAmount} credits!`);
      } else if (hit >= 90) {
        winAmount = betAmount * 5;
        toast.success(`🐂 Great shot! Won ${winAmount} credits!`);
      } else if (hit >= 70) {
        winAmount = betAmount * 2;
        toast.success(`Good hit! Won ${winAmount} credits!`);
      } else {
        toast.error(`Score: ${hit} - Try again!`);
      }

      if (winAmount > 0) {
        setCredits(prev => prev + winAmount);
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bulls Eye 🐂</h1>
          <p className="text-muted-foreground">Hit the target to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {score !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-12 rounded-full border-4 border-primary">
              <p className="text-7xl font-bold text-primary">{score}</p>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>100: 20x | 90-99: 5x | 70-89: 2x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Shooting..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BullsEye;