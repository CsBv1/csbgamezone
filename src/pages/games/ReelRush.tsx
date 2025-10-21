import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const ReelRush = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [reels, setReels] = useState<string[][]>([[], [], []]);
  const betAmount = 50;

  const symbols = ["🐂", "💰", "💎", "⭐", "🎰", "🔔", "🍒"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newReels = [
      Array(3).fill(0).map(() => symbols[Math.floor(Math.random() * symbols.length)]),
      Array(3).fill(0).map(() => symbols[Math.floor(Math.random() * symbols.length)]),
      Array(3).fill(0).map(() => symbols[Math.floor(Math.random() * symbols.length)]),
    ];

    setReels(newReels);

    setTimeout(() => {
      let winAmount = 0;
      
      // Check rows
      for (let row = 0; row < 3; row++) {
        const rowSymbols = [newReels[0][row], newReels[1][row], newReels[2][row]];
        if (rowSymbols[0] === rowSymbols[1] && rowSymbols[1] === rowSymbols[2]) {
          winAmount += betAmount * 5;
        }
      }

      if (winAmount > 0) {
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Win! Earned ${winAmount} credits!`);
      } else {
        toast.error("No winning lines!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Reel Rush 🐂</h1>
          <p className="text-muted-foreground">Match symbols on any line!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="flex gap-4 justify-center mb-6">
          {reels.map((reel, reelIndex) => (
            <div key={reelIndex} className="flex flex-col gap-2">
              {reel.map((symbol, symbolIndex) => (
                <div key={symbolIndex} className="bg-primary/20 p-4 rounded-lg border-2 border-primary w-20 h-20 flex items-center justify-center">
                  <p className="text-4xl">{symbol || "❓"}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>3 in a row: 5x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Spin (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default ReelRush;
