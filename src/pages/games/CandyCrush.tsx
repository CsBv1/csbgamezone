import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CandyCrush = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [candies, setCandies] = useState<string[]>([]);
  const betAmount = 50;

  const candyTypes = ["🍬", "🍭", "🍫", "🍩", "🍰"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newCandies = Array(5).fill(0).map(() => 
      candyTypes[Math.floor(Math.random() * candyTypes.length)]
    );
    setCandies(newCandies);

    setTimeout(() => {
      const counts = newCandies.reduce((acc, candy) => {
        acc[candy] = (acc[candy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxMatch = Math.max(...Object.values(counts));
      let winAmount = 0;

      if (maxMatch === 5) winAmount = betAmount * 20;
      else if (maxMatch === 4) winAmount = betAmount * 8;
      else if (maxMatch === 3) winAmount = betAmount * 3;

      if (winAmount > 0) {
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${maxMatch} match! Won ${winAmount} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Candy Crush 🐂</h1>
          <p className="text-muted-foreground">Match candies for sweet wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {candies.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {candies.map((candy, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-4 border-primary">
                <p className="text-6xl">{candy}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>5 Match: 20x | 4 Match: 8x | 3 Match: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default CandyCrush;
