import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const NumberBet = () => {
  const navigate = useNavigate();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [credits, setCredits] = useState(100);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [betting, setBetting] = useState(false);

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const placeBet = () => {
    if (selectedNumber === null) {
      toast.error("Please select a number first!");
      return;
    }

    if (credits < 10) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits((c) => c - 10);
    setBetting(true);

    // Simulate rolling
    setTimeout(() => {
      const result = Math.floor(Math.random() * 10);
      setLastResult(result);
      setBetting(false);

      if (result === selectedNumber) {
        const winAmount = 100;
        setCredits((c) => c + winAmount);
        toast.success(`🎉 Perfect match! You won ${winAmount} credits!`);
      } else if (Math.abs(result - selectedNumber) === 1) {
        const winAmount = 30;
        setCredits((c) => c + winAmount);
        toast.success(`Close! You won ${winAmount} credits!`);
      } else {
        toast.error("Better luck next time!");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-5 h-5" />
            Back to Games
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-8 bg-card border-2 border-primary/30 glow-gold">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Number Bet
            </h1>
            <div className="mt-4">
              <p className="text-muted-foreground">Credits</p>
              <p className="text-3xl font-bold text-primary">{credits}</p>
            </div>
          </div>

          {/* Number Selection */}
          <div className="bg-secondary rounded-lg p-8 mb-6">
            <p className="text-center text-muted-foreground mb-4">
              Select a number (0-9)
            </p>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {numbers.map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  disabled={betting}
                  className={`aspect-square rounded-lg text-2xl font-bold transition-all ${
                    selectedNumber === num
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-background text-foreground hover:bg-primary/20"
                  } ${betting ? "opacity-50" : ""}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {lastResult !== null && (
              <div className="text-center mb-4">
                <p className="text-muted-foreground mb-2">Last Result:</p>
                <div className="inline-block bg-background rounded-lg px-6 py-3 text-4xl font-bold text-primary border-2 border-primary">
                  {lastResult}
                </div>
              </div>
            )}

            <Button
              variant="gold"
              size="lg"
              onClick={placeBet}
              disabled={betting || credits < 10 || selectedNumber === null}
              className="w-full"
            >
              {betting ? "Rolling..." : "Place Bet (10 Credits)"}
            </Button>
          </div>

          {/* Payout Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2 font-semibold">Payouts:</p>
            <p>Exact match = 100 credits</p>
            <p>±1 from selected = 30 credits</p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default NumberBet;
