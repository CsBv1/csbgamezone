import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const Roulette = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [spinning, setSpinning] = useState(false);
  const [credits, setCredits] = useState(1000);
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [lastNumber, setLastNumber] = useState<number | null>(null);

  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const spin = () => {
    if (!selectedBet) {
      toast.error("Please place a bet first!");
      audioManager.playSFX('error');
      return;
    }
    if (credits < 50) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }

    setCredits(credits - 50);
    setSpinning(true);
    audioManager.playSFX('spin');

    // Tick sounds during spin
    const tickInterval = setInterval(() => {
      audioManager.playSFX('wheelTick');
    }, 200);

    setTimeout(() => {
      clearInterval(tickInterval);
      audioManager.playSFX('wheelStop');
      
      const result = Math.floor(Math.random() * 37);
      setLastNumber(result);
      setSpinning(false);

      let won = false;
      let payout = 0;

      if (selectedBet === "red" && redNumbers.includes(result)) {
        won = true;
        payout = 100;
      } else if (selectedBet === "black" && !redNumbers.includes(result) && result !== 0) {
        won = true;
        payout = 100;
      } else if (selectedBet === "even" && result % 2 === 0 && result !== 0) {
        won = true;
        payout = 100;
      } else if (selectedBet === "odd" && result % 2 === 1) {
        won = true;
        payout = 100;
      } else if (selectedBet === result.toString()) {
        won = true;
        payout = 1800;
      }

      if (won) {
        setCredits(c => c + payout);
        audioManager.playSFX(payout > 500 ? 'jackpot' : 'win');
        toast.success(`🐂 Number ${result}! You won ${payout} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error(`Number ${result}. Better luck next time!`);
      }
    }, 2000);
  };

  const handleBetClick = (bet: string) => {
    setSelectedBet(bet);
    audioManager.playSFX('buttonPress');
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return "bg-green-600";
    return redNumbers.includes(num) ? "bg-red-600" : "bg-zinc-900";
  };

  return (
    <div className="min-h-screen bull-pattern">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
            {getBackLabel()}
          </Button>
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mt-2">
            Roulette 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-20 h-20 rounded-full border-4 border-primary shadow-lg animate-pulse" />
          </div>

          <div className="text-center mb-8">
            <div className={`inline-block w-32 h-32 rounded-full border-8 border-primary flex items-center justify-center text-5xl font-bold ${spinning ? 'animate-spin' : ''}`}>
              {spinning ? "🐂" : lastNumber !== null ? lastNumber : "?"}
            </div>
            {lastNumber !== null && !spinning && (
              <p className="mt-4 text-xl font-bold">Last: {lastNumber}</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Quick Bets (2x payout)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant={selectedBet === "red" ? "default" : "outline"}
                onClick={() => handleBetClick("red")}
                className="h-16 bg-red-600 hover:bg-red-700"
              >
                Red
              </Button>
              <Button
                variant={selectedBet === "black" ? "default" : "outline"}
                onClick={() => handleBetClick("black")}
                className="h-16 bg-zinc-900 hover:bg-zinc-800"
              >
                Black
              </Button>
              <Button
                variant={selectedBet === "even" ? "default" : "outline"}
                onClick={() => handleBetClick("even")}
                className="h-16"
              >
                Even
              </Button>
              <Button
                variant={selectedBet === "odd" ? "default" : "outline"}
                onClick={() => handleBetClick("odd")}
                className="h-16"
              >
                Odd
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Number Bets (36x payout)</h3>
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto">
              {numbers.map(num => (
                <button
                  key={num}
                  onClick={() => handleBetClick(num.toString())}
                  className={`h-12 rounded font-bold text-white ${getNumberColor(num)} ${
                    selectedBet === num.toString() ? 'ring-4 ring-primary' : ''
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="gold"
            size="xl"
            className="w-full"
            onClick={spin}
            disabled={spinning || !selectedBet}
          >
            {spinning ? "Spinning... 🐂" : "Spin (50 credits)"}
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default Roulette;
