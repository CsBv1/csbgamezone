import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BallDrop = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const multipliers = [0, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const index = Math.floor(Math.random() * multipliers.length);
      setResult(index);
      const mult = multipliers[index];

      if (mult > 0) {
        const winAmount = Math.floor(betAmount * mult);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${mult}x! Won ${winAmount} credits!`);
      } else {
        toast.error("No win this time!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Ball Drop 🐂</h1>
          <p className="text-muted-foreground">Watch the ball drop!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="flex gap-2 justify-center mb-6">
          {multipliers.map((mult, i) => (
            <div
              key={i}
              className={`p-4 rounded border-2 ${
                result === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border"
              }`}
            >
              <p className="text-sm font-bold">{mult}x</p>
            </div>
          ))}
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <p className="text-4xl">🎱</p>
            <p className="text-xl font-bold text-primary mt-2">
              Landed on {multipliers[result]}x
            </p>
          </div>
        )}

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Dropping..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BallDrop;
