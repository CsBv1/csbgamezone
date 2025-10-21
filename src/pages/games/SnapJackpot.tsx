import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const SnapJackpot = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("SnapJackpot");
  const [playing, setPlaying] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const betAmount = 50;

  const jackpotSymbols = ["🐂", "🐂", "🐂", "💰", "💎", "⭐", "🔔", "7️⃣"];

  const play = async () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    await deductCredits(betAmount);
    setPlaying(true);

    const newSymbols = Array(3).fill(0).map(() => 
      jackpotSymbols[Math.floor(Math.random() * jackpotSymbols.length)]
    );
    setSymbols(newSymbols);

    setTimeout(async () => {
      if (newSymbols.every(s => s === "🐂")) {
        const winAmount = betAmount * 100;
        await awardCredits(winAmount);
        toast.success(`🐂 SNAP JACKPOT! Won ${winAmount} credits!`);
      } else if (newSymbols[0] === newSymbols[1] && newSymbols[1] === newSymbols[2]) {
        const winAmount = betAmount * 15;
        await awardCredits(winAmount);
        toast.success(`🐂 Triple match! Won ${winAmount} credits!`);
      } else if (newSymbols[0] === newSymbols[1] || newSymbols[1] === newSymbols[2]) {
        const winAmount = betAmount * 2;
        await awardCredits(winAmount);
        toast.success(`Double match! Won ${winAmount} credits!`);
      } else {
        toast.error("No match!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Snap Jackpot 🐂</h1>
          <p className="text-muted-foreground">Quick spins, big wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {symbols.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {symbols.map((symbol, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-4 border-primary">
                <p className="text-7xl">{symbol}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>🐂🐂🐂: 100x | Triple: 15x | Double: 2x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Snap (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default SnapJackpot;