import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const DiamondDash = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState<string[]>(new Array(20).fill(""));
  const [collected, setCollected] = useState(0);
  const betAmount = 50;

  const symbols = ["💎", "💎", "💎", "🔷", "🔷", "⬛"];

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setGrid(new Array(20).fill(""));
    setCollected(0);
  };

  const pick = (index: number) => {
    if (!playing || grid[index]) return;

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const newGrid = [...grid];
    newGrid[index] = symbol;
    setGrid(newGrid);

    if (symbol === "⬛") {
      toast.error("Hit coal! Game over!");
      if (collected > 0) {
        setCredits(prev => prev + collected);
      }
      setPlaying(false);
    } else {
      const value = symbol === "💎" ? 25 : 15;
      setCollected(prev => prev + value);
      toast.success(`Found ${symbol}! +${value}`);
    }
  };

  const cashOut = () => {
    if (playing && collected > 0) {
      setCredits(prev => prev + collected);
      toast.success(`🐂 Cashed out ${collected} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Diamond Dash 🐂</h1>
          <p className="text-muted-foreground">Collect diamonds, avoid coal!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-primary">Collected: {collected}</p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 mb-6">
          {Array(20).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => pick(i)}
              disabled={!playing || grid[i] !== ""}
              variant={grid[i] ? "default" : "outline"}
              className="h-16 text-3xl"
            >
              {grid[i] || "❓"}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {!playing ? (
            <Button onClick={startGame} size="lg" className="col-span-2">
              Play ({betAmount} credits)
            </Button>
          ) : (
            <Button onClick={cashOut} disabled={collected === 0} size="lg" className="col-span-2">
              Cash Out ({collected})
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DiamondDash;
