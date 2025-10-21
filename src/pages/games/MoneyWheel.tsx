import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const MoneyWheel = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [choice, setChoice] = useState(5);
  const betAmount = 50;

  const multipliers = [1, 2, 5, 10, 20, 40];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const spin = multipliers[Math.floor(Math.random() * multipliers.length)];
      setResult(spin);

      if (spin === choice) {
        const winAmount = betAmount * choice;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${spin}x! Won ${winAmount} credits!`);
      } else {
        toast.error(`Landed on ${spin}x!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Money Wheel 🐂</h1>
          <p className="text-muted-foreground">Spin to win big multipliers!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-6xl font-bold text-primary">{result}x</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {multipliers.map(mult => (
            <Button
              key={mult}
              variant={choice === mult ? "default" : "outline"}
              onClick={() => !playing && setChoice(mult)}
              size="lg"
            >
              {mult}x
            </Button>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default MoneyWheel;
