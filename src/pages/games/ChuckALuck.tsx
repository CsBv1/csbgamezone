import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const ChuckALuck = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [dice, setDice] = useState<number[]>([]);
  const [choice, setChoice] = useState(3);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newDice = Array(3).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    setDice(newDice);

    setTimeout(() => {
      const matches = newDice.filter(d => d === choice).length;
      if (matches > 0) {
        const winAmount = betAmount * (matches + 1);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${matches} match${matches > 1 ? 'es' : ''}! Won ${winAmount} credits!`);
      } else {
        toast.error("No matches!");
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Chuck-a-Luck 🐂</h1>
          <p className="text-muted-foreground">Pick a number and match!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {dice.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {dice.map((d, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-5xl font-bold text-primary">{d}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-6 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <Button
              key={num}
              variant={choice === num ? "default" : "outline"}
              onClick={() => !playing && setChoice(num)}
              size="lg"
            >
              {num}
            </Button>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Rolling..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default ChuckALuck;
