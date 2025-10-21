import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BlitzBet = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [number, setNumber] = useState<number | null>(null);
  const [choice, setChoice] = useState<"odd" | "even">("even");
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const num = Math.floor(Math.random() * 100) + 1;
      setNumber(num);

      const isEven = num % 2 === 0;
      const correct = (choice === "even" && isEven) || (choice === "odd" && !isEven);

      if (correct) {
        let mult = 2;
        if (num % 10 === 0) mult = 5;
        else if (num % 5 === 0) mult = 3;

        const winAmount = betAmount * mult;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${num} is ${choice}! Won ${winAmount} credits!`);
      } else {
        toast.error(`${num} is ${isEven ? "even" : "odd"}!`);
      }
      setPlaying(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Blitz Bet 🐂</h1>
          <p className="text-muted-foreground">Fast odd/even betting!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {number !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
              <p className="text-7xl font-bold text-primary">{number}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant={choice === "odd" ? "default" : "outline"}
            onClick={() => !playing && setChoice("odd")}
            disabled={playing}
            size="lg"
          >
            ODD
          </Button>
          <Button
            variant={choice === "even" ? "default" : "outline"}
            onClick={() => !playing && setChoice("even")}
            disabled={playing}
            size="lg"
          >
            EVEN
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>Correct: 2x | Div by 5: 3x | Div by 10: 5x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BlitzBet;