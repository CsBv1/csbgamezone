import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CoinFlip = () => {
  const navigate = useNavigate();
  const [flipping, setFlipping] = useState(false);
  const [credits, setCredits] = useState(1000);
  const [prediction, setPrediction] = useState<"heads" | "tails" | null>(null);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);

  const flip = () => {
    if (!prediction) {
      toast.error("Choose heads or tails first!");
      return;
    }
    if (credits < 50) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(credits - 50);
    setFlipping(true);
    setResult(null);

    setTimeout(() => {
      const coinResult = Math.random() > 0.5 ? "heads" : "tails";
      setResult(coinResult);
      setFlipping(false);

      if (prediction === coinResult) {
        setCredits(c => c + 100);
        toast.success("🐂 You won 100 credits!");
      } else {
        toast.error("Wrong side! Try again!");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-5 h-5" />
            Back to Games
          </Button>
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mt-2">
            Coin Flip 🐂
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
            <div className={`inline-block w-48 h-48 rounded-full border-8 border-primary flex items-center justify-center text-7xl ${flipping ? 'animate-spin' : ''}`}>
              {flipping ? "🐂" : result === "heads" ? "👑" : result === "tails" ? "💰" : "?"}
            </div>
            {result && !flipping && (
              <p className="mt-4 text-2xl font-bold capitalize">
                {result}!
              </p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-center">Choose Your Side</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={prediction === "heads" ? "default" : "outline"}
                size="xl"
                onClick={() => setPrediction("heads")}
                disabled={flipping}
                className="h-24 text-2xl"
              >
                👑 Heads
              </Button>
              <Button
                variant={prediction === "tails" ? "default" : "outline"}
                size="xl"
                onClick={() => setPrediction("tails")}
                disabled={flipping}
                className="h-24 text-2xl"
              >
                💰 Tails
              </Button>
            </div>
          </div>

          <Button
            variant="gold"
            size="xl"
            className="w-full mb-6"
            onClick={flip}
            disabled={flipping || !prediction}
          >
            {flipping ? "Flipping... 🐂" : "Flip Coin (50 credits)"}
          </Button>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">Payout:</h3>
            <p className="text-sm text-muted-foreground">
              Win: 100 credits (2x) | Lose: 0 credits
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default CoinFlip;
