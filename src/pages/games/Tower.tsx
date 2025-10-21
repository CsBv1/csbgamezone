import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const Tower = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const betAmount = 50;

  const climbLevel = () => {
    if (!playing) {
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setLevel(0);
      setMultiplier(1);
    }

    const success = Math.random() > 0.3;
    if (success && level < 10) {
      const newLevel = level + 1;
      const newMult = 1 + (newLevel * 0.5);
      setLevel(newLevel);
      setMultiplier(newMult);
      toast.success(`🐂 Level ${newLevel}! Multiplier: ${newMult.toFixed(1)}x`);
    } else {
      if (level === 0) {
        toast.error("Failed to climb!");
      } else {
        const winAmount = Math.floor(betAmount * multiplier);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Cashed out at level ${level}! Won ${winAmount} credits!`);
      }
      setPlaying(false);
      setLevel(0);
      setMultiplier(1);
    }
  };

  const cashOut = () => {
    if (playing && level > 0) {
      const winAmount = Math.floor(betAmount * multiplier);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out! Won ${winAmount} credits!`);
      setPlaying(false);
      setLevel(0);
      setMultiplier(1);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Tower 🐂</h1>
          <p className="text-muted-foreground">Climb higher for bigger wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-3xl font-bold text-primary">Level {level}</p>
              <p className="text-5xl font-bold text-primary mt-2">{multiplier.toFixed(1)}x</p>
              <p className="text-sm text-muted-foreground mt-2">
                Win: {Math.floor(betAmount * multiplier)} credits
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={climbLevel} disabled={playing && level >= 10} size="lg" className="w-full">
            {playing ? "Climb Higher" : `Start (${betAmount} credits)`}
          </Button>
          <Button onClick={cashOut} disabled={!playing || level === 0} variant="outline" size="lg" className="w-full">
            Cash Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Tower;
