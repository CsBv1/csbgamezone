import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const FishPrawnCrab = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [dice, setDice] = useState<string[]>([]);
  const [choice, setChoice] = useState("🐟");
  const betAmount = 50;

  const symbols = ["🐟", "🦐", "🦀", "🐂", "🐓", "🦆"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newDice = Array(3).fill(0).map(() => symbols[Math.floor(Math.random() * symbols.length)]);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Fish Prawn Crab 🐂</h1>
          <p className="text-muted-foreground">Ancient Chinese dice game!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {dice.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {dice.map((d, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-6xl">{d}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {symbols.map(sym => (
            <Button
              key={sym}
              variant={choice === sym ? "default" : "outline"}
              onClick={() => !playing && setChoice(sym)}
              size="lg"
              className="text-3xl"
            >
              {sym}
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

export default FishPrawnCrab;
