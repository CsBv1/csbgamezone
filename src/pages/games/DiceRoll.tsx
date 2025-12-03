import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const DiceRoll = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [credits, setCredits] = useState(100);
  const [prediction, setPrediction] = useState<"high" | "low" | null>(null);

  const rollDice = () => {
    if (prediction === null) {
      toast.error("Choose High (8-12) or Low (2-6) first!");
      return;
    }

    if (credits < 15) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits((c) => c - 15);
    setRolling(true);

    const interval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
      setDice(finalDice);
      setRolling(false);

      const total = finalDice[0] + finalDice[1];
      const isHigh = total >= 8;
      const won = (prediction === "high" && isHigh) || (prediction === "low" && !isHigh);

      if (won) {
        const winAmount = total === 7 ? 150 : 60;
        setCredits((c) => c + winAmount);
        toast.success(`🎉 You won! Total: ${total}. +${winAmount} credits`);
      } else {
        toast.error(`Total was ${total}. Better luck next time!`);
      }

      setPrediction(null);
    }, 2000);
  };

  const getDiceDisplay = (value: number) => {
    const dots: Record<number, string> = {
      1: "⚀",
      2: "⚁",
      3: "⚂",
      4: "⚃",
      5: "⚄",
      6: "⚅",
    };
    return dots[value];
  };

  return (
    <div className="min-h-screen bull-pattern flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
            {getBackLabel()}
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-8 bg-card border-2 border-primary/30 glow-gold">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Dice Roll
            </h1>
            <div className="mt-4">
              <p className="text-muted-foreground">Credits</p>
              <p className="text-3xl font-bold text-primary">{credits}</p>
            </div>
          </div>

          {/* Prediction Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setPrediction("low")}
              disabled={rolling}
              className={`flex-1 p-6 rounded-lg font-bold text-xl transition-all ${
                prediction === "low"
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-secondary hover:bg-secondary/80"
              } ${rolling ? "opacity-50" : ""}`}
            >
              LOW
              <div className="text-sm font-normal mt-1">2-6</div>
            </button>
            <button
              onClick={() => setPrediction("high")}
              disabled={rolling}
              className={`flex-1 p-6 rounded-lg font-bold text-xl transition-all ${
                prediction === "high"
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-secondary hover:bg-secondary/80"
              } ${rolling ? "opacity-50" : ""}`}
            >
              HIGH
              <div className="text-sm font-normal mt-1">8-12</div>
            </button>
          </div>

          {/* Dice Display */}
          <div className="bg-secondary rounded-lg p-8 mb-6">
            <div className="flex justify-center gap-8 mb-6">
              {dice.map((value, index) => (
                <div
                  key={index}
                  className={`w-24 h-24 bg-background rounded-lg flex items-center justify-center text-7xl border-2 border-primary transition-all ${
                    rolling ? "animate-bounce" : ""
                  }`}
                >
                  {getDiceDisplay(value)}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Total</p>
              <p className="text-5xl font-bold text-primary">{dice[0] + dice[1]}</p>
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            onClick={rollDice}
            disabled={rolling || prediction === null || credits < 15}
            className="w-full"
          >
            {rolling ? "Rolling..." : "Roll Dice (15 Credits)"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            <p className="mb-2 font-semibold">Payouts:</p>
            <p>Correct prediction = 60 credits</p>
            <p>Lucky 7 = 150 credits</p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default DiceRoll;
