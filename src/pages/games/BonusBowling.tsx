import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BonusBowling = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [pins, setPins] = useState<number | null>(null);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const knocked = Math.floor(Math.random() * 11);
      setPins(knocked);

      if (knocked === 10) {
        const winAmount = betAmount * 10;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 STRIKE! Won ${winAmount} credits!`);
      } else if (knocked >= 7) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${knocked} pins! Won ${winAmount} credits!`);
      } else if (knocked >= 5) {
        const winAmount = betAmount * 1.5;
        setCredits(prev => prev + winAmount);
        toast.success(`${knocked} pins! Won ${winAmount} credits!`);
      } else {
        toast.error(`Only ${knocked} pins knocked!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bonus Bowling 🐂</h1>
          <p className="text-muted-foreground">Strike for big wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {pins !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-6xl font-bold text-primary">{pins}</p>
              <p className="text-sm text-muted-foreground mt-2">Pins Knocked</p>
            </div>
          </div>
        )}

        <div className="text-center mb-6 text-sm text-muted-foreground">
          <p>Strike (10): 10x</p>
          <p>7-9 pins: 3x</p>
          <p>5-6 pins: 1.5x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Bowling..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BonusBowling;
