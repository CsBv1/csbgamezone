import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const NumberGuess = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [guess, setGuess] = useState(50);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const number = Math.floor(Math.random() * 100) + 1;
      setResult(number);

      const diff = Math.abs(number - guess);
      
      if (diff === 0) {
        const winAmount = betAmount * 50;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 EXACT MATCH! Won ${winAmount} credits!`);
      } else if (diff <= 5) {
        const winAmount = betAmount * 10;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Very close! Won ${winAmount} credits!`);
      } else if (diff <= 10) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`Close! Won ${winAmount} credits!`);
      } else {
        toast.error(`Number was ${number}. Difference: ${diff}`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Number Guess 🐂</h1>
          <p className="text-muted-foreground">Guess the number 1-100!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-4">Your Guess: {guess}</p>
          <input
            type="range"
            min="1"
            max="100"
            value={guess}
            onChange={(e) => !playing && setGuess(parseInt(e.target.value))}
            className="w-full"
            disabled={playing}
          />
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-sm text-muted-foreground">Number was</p>
              <p className="text-6xl font-bold text-primary">{result}</p>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>Exact: 50x | ±5: 10x | ±10: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default NumberGuess;