import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const TripleChance = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("TripleChance");
  const [playing, setPlaying] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const betAmount = 50;

  const symbolList = ["🐂", "💎", "⭐", "🔔", "🍀", "7️⃣"];

  const play = async () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    await deductCredits(betAmount);
    setPlaying(true);

    const newSymbols = Array(3).fill(0).map(() => 
      symbolList[Math.floor(Math.random() * symbolList.length)]
    );
    setSymbols(newSymbols);

    setTimeout(async () => {
      const [s1, s2, s3] = newSymbols;
      
      if (s1 === s2 && s2 === s3) {
        const winAmount = betAmount * 10;
        await awardCredits(winAmount);
        toast.success(`🐂 TRIPLE MATCH! Won ${winAmount} credits!`);
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        const winAmount = betAmount * 3;
        await awardCredits(winAmount);
        toast.success(`🐂 Double match! Won ${winAmount} credits!`);
      } else {
        toast.error("No match!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Triple Chance 🐂</h1>
          <p className="text-muted-foreground">Match symbols to win big!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {symbols.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {symbols.map((symbol, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-6xl">{symbol}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>Triple Match: 10x | Double Match: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default TripleChance;