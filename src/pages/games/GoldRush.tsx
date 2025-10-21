import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const GoldRush = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [nuggets, setNuggets] = useState<string[]>(new Array(12).fill(""));
  const [totalGold, setTotalGold] = useState(0);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setNuggets(new Array(12).fill(""));
    setTotalGold(0);
  };

  const dig = (index: number) => {
    if (!playing || nuggets[index]) return;

    const outcomes = ["💎", "🪙", "🪨", "⚡"];
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    const newNuggets = [...nuggets];
    newNuggets[index] = pick;
    setNuggets(newNuggets);

    if (pick === "⚡") {
      toast.error("Hit dynamite! Game over!");
      setPlaying(false);
      if (totalGold > 0) {
        setCredits(prev => prev + totalGold);
      }
    } else {
      const value = pick === "💎" ? 100 : pick === "🪙" ? 50 : 10;
      setTotalGold(prev => prev + value);
      toast.success(`Found ${pick}! +${value} credits!`);
    }
  };

  const collect = () => {
    if (playing && totalGold > 0) {
      setCredits(prev => prev + totalGold);
      toast.success(`🐂 Collected ${totalGold} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Gold Rush 🐂</h1>
          <p className="text-muted-foreground">Dig for gold, avoid dynamite!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-primary">Gold: {totalGold} credits</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          {Array(12).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => dig(i)}
              disabled={!playing || nuggets[i] !== ""}
              variant={nuggets[i] ? "default" : "outline"}
              className="h-20 text-4xl"
            >
              {nuggets[i] || "⛏️"}
            </Button>
          ))}
        </div>

        {!playing ? (
          <Button onClick={startGame} size="lg" className="w-full">
            Start Mining ({betAmount} credits)
          </Button>
        ) : (
          <Button onClick={collect} disabled={totalGold === 0} size="lg" className="w-full">
            Collect Gold
          </Button>
        )}
      </Card>
    </div>
  );
};

export default GoldRush;