import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const PowerPick = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [boxes, setBoxes] = useState<string[]>(new Array(9).fill(""));
  const [picksLeft, setPicksLeft] = useState(3);
  const [totalWin, setTotalWin] = useState(0);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setBoxes(new Array(9).fill(""));
    setPicksLeft(3);
    setTotalWin(0);
  };

  const pickBox = (index: number) => {
    if (!playing || boxes[index] || picksLeft === 0) return;

    const prizes = ["💰", "💎", "⭐", "🎁"];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    
    const newBoxes = [...boxes];
    newBoxes[index] = prize;
    setBoxes(newBoxes);

    const value = prize === "💎" ? 150 : prize === "⭐" ? 100 : prize === "💰" ? 75 : 50;
    setTotalWin(prev => prev + value);
    
    const newPicks = picksLeft - 1;
    setPicksLeft(newPicks);

    if (newPicks === 0) {
      const finalWin = totalWin + value;
      setCredits(prev => prev + finalWin);
      toast.success(`🐂 Won ${finalWin} total credits!`);
      setPlaying(false);
    } else {
      toast.success(`Found ${prize}! +${value} credits`);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Power Pick 🐂</h1>
          <p className="text-muted-foreground">Pick 3 boxes for prizes!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-xl font-bold text-primary">
              Picks Left: {picksLeft} | Total: {totalWin} credits
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {Array(9).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => pickBox(i)}
              disabled={!playing || boxes[i] !== ""}
              variant={boxes[i] ? "default" : "outline"}
              className="h-24 text-5xl"
            >
              {boxes[i] || "🎁"}
            </Button>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>💎 150 | ⭐ 100 | 💰 75 | 🎁 50</p>
        </div>

        {!playing && (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        )}
      </Card>
    </div>
  );
};

export default PowerPick;