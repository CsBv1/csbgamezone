import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const LuckyStrike = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [pins, setPins] = useState<boolean[]>(Array(10).fill(true));
  const [strikes, setStrikes] = useState(0);
  const betAmount = 50;

  const bowl = () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setPins(Array(10).fill(true));
      setStrikes(0);
    }

    const knockedDown = pins.map(() => Math.random() > 0.5);
    setPins(knockedDown);

    const pinsDown = knockedDown.filter(p => !p).length;
    
    if (pinsDown === 10) {
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      const winAmount = betAmount * (1 + newStrikes * 2);
      setCredits(prev => prev + winAmount);
      toast.success(`🎳 STRIKE! Won ${winAmount} credits!`);
      
      setTimeout(() => {
        setPins(Array(10).fill(true));
      }, 1000);
    } else if (pinsDown > 0) {
      toast(`Knocked down ${pinsDown} pins!`);
    } else {
      toast.error("Gutter ball! Game over");
      setPlaying(false);
    }
  };

  const cashOut = () => {
    toast.success("🐂 Game ended!");
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Lucky Strike 🐂</h1>
          <p className="text-muted-foreground">Bowl strikes to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-primary">Strikes: {strikes}</p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="grid grid-cols-4 gap-3">
            {pins.map((standing, i) => (
              <div key={i} className={`text-5xl ${i >= 10 ? 'col-start-2' : ''}`}>
                {standing ? "🎳" : "💥"}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={bowl} disabled={!playing && strikes > 0} size="lg">
            {playing ? "Bowl" : `Start (${betAmount})`}
          </Button>
          <Button onClick={cashOut} disabled={!playing} variant="outline" size="lg">
            End Game
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LuckyStrike;
