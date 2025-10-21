import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const WildWest = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("WildWest");
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const betAmount = 50;

  const outcomes = ["🤠", "🐴", "🌵", "⭐", "💰"];
  const multipliers = { "🤠": 2, "🐴": 3, "🌵": 1, "⭐": 5, "💰": 10 };

  const play = async () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    await deductCredits(betAmount);
    setPlaying(true);

    setTimeout(async () => {
      const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
      setResult(pick);
      const mult = multipliers[pick as keyof typeof multipliers];
      const winAmount = betAmount * mult;
      
      await awardCredits(winAmount);
      toast.success(`🐂 ${pick} - Won ${winAmount} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Wild West 🐂</h1>
          <p className="text-muted-foreground">Spin for western fortunes!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
              <p className="text-8xl">{result}</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-4">
              {multipliers[result as keyof typeof multipliers]}x
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 mb-6 text-center">
          {outcomes.map(symbol => (
            <div key={symbol} className="border border-border rounded p-3">
              <p className="text-4xl mb-2">{symbol}</p>
              <p className="text-sm font-bold">{multipliers[symbol as keyof typeof multipliers]}x</p>
            </div>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default WildWest;
