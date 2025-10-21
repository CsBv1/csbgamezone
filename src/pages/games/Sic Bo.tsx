import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const SicBo = () => {
  const navigate = useNavigate();
  const { credits, diamonds, deductCredits, awardDiamonds, recordLoss, loading } = useGameLogic("Sic Bo");
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState([1, 1, 1]);
  const [bet, setBet] = useState<"big" | "small" | "triple" | null>(null);
  const betAmount = 50;

  const roll = async () => {
    if (!bet) {
      toast.error("Place a bet first!");
      return;
    }

    const success = await deductCredits(betAmount);
    if (!success) return;

    setRolling(true);

    let count = 0;
    const interval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
      count++;
      if (count >= 15) {
        clearInterval(interval);
        const final = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
        setDice(final);
        checkWin(final);
        setRolling(false);
      }
    }, 100);
  };

  const checkWin = async (finalDice: number[]) => {
    const total = finalDice.reduce((a, b) => a + b, 0);
    const isTriple = finalDice[0] === finalDice[1] && finalDice[1] === finalDice[2];

    let won = false;
    let multiplier = 0;

    if (bet === "triple" && isTriple) {
      won = true;
      multiplier = 30;
    } else if (bet === "big" && total >= 11 && total <= 17 && !isTriple) {
      won = true;
      multiplier = 2;
    } else if (bet === "small" && total >= 4 && total <= 10 && !isTriple) {
      won = true;
      multiplier = 2;
    }

    if (won) {
      const diamondsWon = Math.floor(multiplier * 10); // Award diamonds based on multiplier
      await awardDiamonds(diamondsWon, multiplier);
    } else {
      await recordLoss(betAmount);
      toast.error(`Total: ${total}. Try again!`);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Sic Bo 🐂</h1>
          <p className="text-muted-foreground">Three dice betting game!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <div className="text-2xl font-bold text-accent">💎 {diamonds}</div>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="flex gap-6 justify-center mb-6">
          {dice.map((d, i) => (
            <div key={i} className="w-24 h-24 bg-white rounded-lg flex items-center justify-center text-4xl font-bold border-4 border-primary">
              {d}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-primary">Total: {dice.reduce((a, b) => a + b, 0)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button onClick={() => !rolling && setBet("small")} variant={bet === "small" ? "default" : "outline"} disabled={rolling}>
            Small (4-10) 2x
          </Button>
          <Button onClick={() => !rolling && setBet("big")} variant={bet === "big" ? "default" : "outline"} disabled={rolling}>
            Big (11-17) 2x
          </Button>
          <Button onClick={() => !rolling && setBet("triple")} variant={bet === "triple" ? "default" : "outline"} disabled={rolling}>
            Triple 30x
          </Button>
        </div>

        <Button onClick={roll} disabled={rolling || !bet || loading} size="lg" className="w-full">
          {loading ? "Loading..." : rolling ? "Rolling..." : `Roll (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default SicBo;
