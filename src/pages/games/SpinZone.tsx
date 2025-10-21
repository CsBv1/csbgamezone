import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const SpinZone = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [symbols, setSymbols] = useState<string[]>(["❓", "❓", "❓"]);
  const betAmount = 50;

  const slotSymbols = ["🐂", "💰", "💎", "🌟", "🔥", "⚡", "🎰"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setSymbols(["❓", "❓", "❓"]);

    let spins = 0;
    const interval = setInterval(() => {
      setSymbols([
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
        slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
      ]);
      spins++;
      
      if (spins >= 10) {
        clearInterval(interval);
        setTimeout(() => {
          const finalSymbols = [
            slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
            slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
            slotSymbols[Math.floor(Math.random() * slotSymbols.length)],
          ];
          setSymbols(finalSymbols);
          checkWin(finalSymbols);
        }, 200);
      }
    }, 100);
  };

  const checkWin = (finalSymbols: string[]) => {
    if (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]) {
      const winAmount = betAmount * 10;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 JACKPOT! Three ${finalSymbols[0]}! Won ${winAmount} credits!`);
    } else if (finalSymbols[0] === finalSymbols[1] || finalSymbols[1] === finalSymbols[2]) {
      const winAmount = betAmount * 2;
      setCredits(prev => prev + winAmount);
      toast.success(`Two match! Won ${winAmount} credits!`);
    } else {
      toast.error("No match!");
    }
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Spin Zone 🐂</h1>
          <p className="text-muted-foreground">Match three to win big!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="flex gap-4 justify-center mb-6">
          {symbols.map((symbol, i) => (
            <div key={i} className="bg-primary/20 p-8 rounded-lg border-4 border-primary w-24 h-24 flex items-center justify-center">
              <p className="text-6xl">{symbol}</p>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>3 Match: 10x | 2 Match: 2x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Spin (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default SpinZone;
