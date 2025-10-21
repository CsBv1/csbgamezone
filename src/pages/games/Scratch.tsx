import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const Scratch = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [scratched, setScratched] = useState<boolean[]>(new Array(9).fill(false));
  const [symbols, setSymbols] = useState<string[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const betAmount = 50;

  const scratchSymbols = ["🐂", "💎", "⭐", "🍀", "👑"];

  const newGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    const newSymbols = Array(9).fill(null).map(() => 
      scratchSymbols[Math.floor(Math.random() * scratchSymbols.length)]
    );
    setSymbols(newSymbols);
    setScratched(new Array(9).fill(false));
    setGameActive(true);
  };

  const scratch = (index: number) => {
    if (!gameActive || scratched[index]) return;

    const newScratched = [...scratched];
    newScratched[index] = true;
    setScratched(newScratched);

    if (newScratched.every(s => s)) {
      checkWin(symbols);
      setGameActive(false);
    }
  };

  const checkWin = (syms: string[]) => {
    const counts = syms.reduce((acc, sym) => {
      acc[sym] = (acc[sym] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(counts));
    if (maxCount >= 3) {
      const winAmount = betAmount * maxCount;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 ${maxCount} match! Won ${winAmount} credits!`);
    } else {
      toast.error("No matches. Try again!");
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Scratch Card 🐂</h1>
          <p className="text-muted-foreground">Scratch to reveal symbols!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
          {Array(9).fill(null).map((_, i) => (
            <button
              key={i}
              onClick={() => scratch(i)}
              disabled={!gameActive}
              className="aspect-square bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-4xl font-bold flex items-center justify-center border-4 border-amber-700 hover:scale-105 transition-transform"
            >
              {scratched[i] ? symbols[i] : "?"}
            </button>
          ))}
        </div>

        <div className="text-center mb-4 text-sm text-muted-foreground">
          <p>Match 3+ symbols to win!</p>
        </div>

        <Button onClick={newGame} disabled={gameActive} size="lg" className="w-full">
          New Card ({betAmount} credits)
        </Button>
      </Card>
    </div>
  );
};

export default Scratch;
