import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";

const SYMBOLS = ["🐂", "💰", "🏆", "💎", "⭐", "🔥"];

const Slots = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState(["🐂", "🐂", "🐂"]);
  const [spinning, setSpinning] = useState(false);
  const [credits, setCredits] = useState(100);
  const [wins, setWins] = useState(0);

  const spin = () => {
    if (credits < 10) {
      toast.error("Not enough credits! Stake more NFTs to earn credits.");
      return;
    }

    setCredits((c) => c - 10);
    setSpinning(true);

    // Animate spinning
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 100);

    // Stop after 2 seconds
    setTimeout(() => {
      clearInterval(interval);
      const finalReels = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ];
      setReels(finalReels);
      setSpinning(false);

      // Check for win
      if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        const winAmount = finalReels[0] === "🐂" ? 100 : 50;
        setCredits((c) => c + winAmount);
        setWins((w) => w + 1);
        toast.success(`🎉 JACKPOT! You won ${winAmount} credits!`);
      } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2]) {
        setCredits((c) => c + 20);
        toast.success("Nice! You won 20 credits!");
      }
    }, 2000);
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
              Bull Slots
            </h1>
            <div className="flex justify-center gap-8 mt-4">
              <div>
                <p className="text-muted-foreground">Credits</p>
                <p className="text-3xl font-bold text-primary">{credits}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Wins</p>
                <p className="text-3xl font-bold text-primary">{wins}</p>
              </div>
            </div>
          </div>

          {/* Slot Machine */}
          <div className="bg-secondary rounded-lg p-8 mb-6">
            <div className="flex justify-center gap-4 mb-8">
              {reels.map((symbol, index) => (
                <div
                  key={index}
                  className={`w-24 h-24 bg-background rounded-lg flex items-center justify-center text-6xl border-2 border-primary transition-all ${
                    spinning ? "animate-bounce" : ""
                  }`}
                >
                  {symbol}
                </div>
              ))}
            </div>

            <Button
              variant="gold"
              size="lg"
              onClick={spin}
              disabled={spinning || credits < 10}
              className="w-full"
            >
              {spinning ? "Spinning..." : "Spin (10 Credits)"}
            </Button>
          </div>

          {/* Payout Table */}
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2 font-semibold">Payouts:</p>
            <p>🐂 🐂 🐂 = 100 credits</p>
            <p>Any 3 match = 50 credits</p>
            <p>Any 2 match = 20 credits</p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Slots;
