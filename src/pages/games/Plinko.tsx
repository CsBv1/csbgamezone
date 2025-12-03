import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const Plinko = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [dropping, setDropping] = useState(false);
  const [credits, setCredits] = useState(1000);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);

  const multipliers = [0.5, 1, 1.5, 2, 3, 5, 3, 2, 1.5, 1, 0.5];

  const dropBall = () => {
    if (credits < 50) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(credits - 50);
    setDropping(true);

    setTimeout(() => {
      const position = Math.floor(Math.random() * multipliers.length);
      const multiplier = multipliers[position];
      const winAmount = Math.floor(50 * multiplier);

      setLastMultiplier(multiplier);
      setCredits(c => c + winAmount);
      setDropping(false);

      if (multiplier >= 3) {
        toast.success(`🐂 ${multiplier}x! Won ${winAmount} credits!`);
      } else if (multiplier >= 1) {
        toast.success(`${multiplier}x multiplier! Won ${winAmount} credits!`);
      } else {
        toast.error(`${multiplier}x - Lost some credits`);
      }
    }, 2000);
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
            Plinko 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-16 h-16 rounded-full border-4 border-primary shadow-lg" />
          </div>

          <div className="mb-8 relative">
            <div className="flex justify-center mb-4">
              <div className={`text-6xl ${dropping ? 'animate-bounce' : ''}`}>
                🐂
              </div>
            </div>

            <div className="grid grid-cols-9 gap-3 mb-4">
              {Array.from({ length: 63 }).map((_, i) => (
                <div key={i} className="w-3 h-3 bg-primary/30 rounded-full mx-auto" />
              ))}
            </div>

            <div className="grid grid-cols-11 gap-1">
              {multipliers.map((mult, i) => (
                <div
                  key={i}
                  className={`p-3 rounded text-center font-bold ${
                    mult >= 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white' :
                    mult >= 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' :
                    mult >= 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' :
                    'bg-gradient-to-br from-red-500 to-rose-500 text-white'
                  } ${lastMultiplier === mult && !dropping ? 'ring-4 ring-primary scale-110' : ''} transition-all`}
                >
                  {mult}x
                </div>
              ))}
            </div>
          </div>

          {lastMultiplier !== null && (
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-primary">
                Last Result: {lastMultiplier}x ({Math.floor(50 * lastMultiplier)} credits)
              </p>
            </div>
          )}

          <Button
            variant="gold"
            size="xl"
            className="w-full"
            onClick={dropBall}
            disabled={dropping}
          >
            {dropping ? "Dropping... 🐂" : "Drop Ball (50 credits)"}
          </Button>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">Multipliers:</h3>
            <p className="text-sm text-muted-foreground">
              0.5x - 5x range. Higher multipliers in the center!
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Plinko;
