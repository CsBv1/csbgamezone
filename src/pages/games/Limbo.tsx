import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const Limbo = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(2);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const roll = (Math.random() * 10).toFixed(2);
      const rollNum = parseFloat(roll);
      setResult(rollNum);

      if (rollNum >= target) {
        const winAmount = Math.floor(betAmount * target);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${rollNum}x! Won ${winAmount} credits!`);
      } else {
        toast.error(`${rollNum}x - Need ${target}x or higher!`);
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={goBack} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> {getBackLabel()}
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Limbo 🐂</h1>
          <p className="text-muted-foreground">Set target multiplier!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <div className="inline-block p-8 bg-primary/20 rounded-lg border-2 border-primary">
              <p className="text-6xl font-bold text-primary">{result}x</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-center mb-2 font-bold">Target Multiplier: {target.toFixed(1)}x</label>
          <input
            type="range"
            min="1.1"
            max="10"
            step="0.1"
            value={target}
            onChange={(e) => !playing && setTarget(parseFloat(e.target.value))}
            disabled={playing}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>1.1x</span>
            <span>10.0x</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-muted-foreground">Win: {Math.floor(betAmount * target)} credits</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Rolling..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default Limbo;
