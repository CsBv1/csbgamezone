import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const FortuneTower = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const betAmount = 50;

  const climb = () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setLevel(0);
      setMultiplier(1);
    }

    const success = Math.random() > 0.4;
    
    if (success) {
      const newLevel = level + 1;
      const newMult = 1 + (newLevel * 0.5);
      setLevel(newLevel);
      setMultiplier(newMult);
      toast.success(`🐂 Climbed to level ${newLevel}! ${newMult.toFixed(1)}x`);
      
      if (newLevel >= 10) {
        const winAmount = Math.floor(betAmount * newMult);
        setCredits(prev => prev + winAmount);
        toast.success(`🎉 Reached the top! Won ${winAmount} credits!`);
        setPlaying(false);
      }
    } else {
      toast.error("Fell! Game over");
      setPlaying(false);
    }
  };

  const cashOut = () => {
    if (playing && level > 0) {
      const winAmount = Math.floor(betAmount * multiplier);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out ${winAmount} credits!`);
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Fortune Tower 🐂</h1>
          <p className="text-muted-foreground">Climb to the top for big wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 p-8 rounded-lg border-4 border-primary">
            <p className="text-6xl mb-2">🏰</p>
            <p className="text-4xl font-bold text-primary">Level {level}/10</p>
            <p className="text-2xl mt-2">{multiplier.toFixed(1)}x</p>
          </div>
        </div>

        {playing && level > 0 && (
          <div className="text-center mb-6">
            <p className="text-lg text-primary font-bold">Win: {Math.floor(betAmount * multiplier)} credits</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={climb} disabled={playing && level >= 10} size="lg">
            {playing ? "Climb" : `Start (${betAmount})`}
          </Button>
          <Button onClick={cashOut} disabled={!playing || level === 0} variant="outline" size="lg">
            Cash Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FortuneTower;
