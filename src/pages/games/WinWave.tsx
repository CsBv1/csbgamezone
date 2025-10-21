import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const WinWave = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("WinWave");
  const [playing, setPlaying] = useState(false);
  const [wave, setWave] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const betAmount = 50;

  const ride = async () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      await deductCredits(betAmount);
      setPlaying(true);
      setWave(0);
      setMultiplier(1);
    }

    const success = Math.random() > 0.45;
    
    if (success) {
      const newWave = wave + 1;
      const newMult = 1 + (newWave * 0.3);
      setWave(newWave);
      setMultiplier(newMult);
      toast.success(`🌊 Rode wave ${newWave}! ${newMult.toFixed(1)}x`);
    } else {
      toast.error("Wiped out!");
      setPlaying(false);
    }
  };

  const cashOut = async () => {
    if (playing && wave > 0) {
      const winAmount = Math.floor(betAmount * multiplier);
      await awardCredits(winAmount);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Win Wave 🐂</h1>
          <p className="text-muted-foreground">Ride the waves of fortune!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
            <p className="text-7xl mb-4">🌊</p>
            <p className="text-5xl font-bold text-primary">Wave {wave}</p>
            <p className="text-3xl mt-2">{multiplier.toFixed(1)}x</p>
          </div>
        </div>

        {playing && wave > 0 && (
          <div className="text-center mb-6">
            <p className="text-2xl font-bold text-primary">Win: {Math.floor(betAmount * multiplier)} credits</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={ride} disabled={!playing && wave > 0} size="lg">
            {playing ? "Ride" : `Start (${betAmount})`}
          </Button>
          <Button onClick={cashOut} disabled={!playing || wave === 0} variant="outline" size="lg">
            Cash Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WinWave;
