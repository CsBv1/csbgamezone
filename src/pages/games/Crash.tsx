import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const Crash = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashed, setCrashed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [betPlaced, setBetPlaced] = useState(false);
  const [credits, setCredits] = useState(1000);
  const [crashPoint, setCrashPoint] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (playing && !crashed) {
      interval = setInterval(() => {
        setMultiplier(m => {
          const newMultiplier = m + 0.01;
          if (newMultiplier >= crashPoint) {
            setCrashed(true);
            setPlaying(false);
            if (betPlaced) {
              toast.error("💥 CRASHED! Lost your bet!");
              setBetPlaced(false);
            }
          }
          return newMultiplier;
        });
      }, 50);
    }

    return () => clearInterval(interval);
  }, [playing, crashed, crashPoint, betPlaced]);

  const startRound = () => {
    const crash = 1 + Math.random() * 9;
    setCrashPoint(crash);
    setMultiplier(1.00);
    setCrashed(false);
    setPlaying(true);
  };

  const placeBet = () => {
    if (credits < 50) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(credits - 50);
    setBetPlaced(true);
    if (!playing) {
      startRound();
    }
  };

  const cashOut = () => {
    if (!betPlaced) return;
    const winAmount = Math.floor(50 * multiplier);
    setCredits(c => c + winAmount);
    setBetPlaced(false);
    toast.success(`🐂 Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount} credits!`);
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
            Crash 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-16 h-16 rounded-full border-4 border-primary shadow-lg" />
          </div>

          <div className="text-center mb-8">
            <div className={`text-8xl font-bold mb-4 ${crashed ? 'text-red-500' : 'gradient-gold bg-clip-text text-transparent'}`}>
              {crashed ? '💥' : `${multiplier.toFixed(2)}x`}
            </div>
            {crashed && (
              <p className="text-2xl font-bold text-red-500">CRASHED!</p>
            )}
          </div>

          <div className="h-48 bg-muted/30 rounded-lg mb-6 relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/50 transition-all duration-100"
              style={{ height: `${Math.min((multiplier / 10) * 100, 100)}%` }}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-4xl">
                🐂
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {!betPlaced ? (
              <Button
                variant="gold"
                size="xl"
                className="flex-1"
                onClick={placeBet}
              >
                Place Bet (50 credits)
              </Button>
            ) : (
              <Button
                variant="default"
                size="xl"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={cashOut}
                disabled={crashed}
              >
                Cash Out ({Math.floor(50 * multiplier)} credits)
              </Button>
            )}
            
            {!playing && (
              <Button
                variant="outline"
                size="xl"
                onClick={startRound}
              >
                Watch Round
              </Button>
            )}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">How to Play:</h3>
            <p className="text-sm text-muted-foreground">
              Place your bet and watch the multiplier rise. Cash out before it crashes! 🐂
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Crash;
