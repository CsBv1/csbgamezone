import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const InstantWin = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const betAmount = 50;

  const outcomes = [
    { symbol: "💥", mult: 0, text: "No Win" },
    { symbol: "⭐", mult: 2, text: "Double" },
    { symbol: "💎", mult: 5, text: "Big Win" },
    { symbol: "👑", mult: 10, text: "Royal" },
    { symbol: "🐂", mult: 20, text: "JACKPOT" },
  ];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    audioManager.playSFX('spin');

    setTimeout(() => {
      const rand = Math.random();
      let outcome;
      
      if (rand < 0.5) outcome = outcomes[0];
      else if (rand < 0.8) outcome = outcomes[1];
      else if (rand < 0.93) outcome = outcomes[2];
      else if (rand < 0.98) outcome = outcomes[3];
      else outcome = outcomes[4];

      setResult(outcome.symbol);

      if (outcome.mult > 0) {
        const winAmount = betAmount * outcome.mult;
        setCredits(prev => prev + winAmount);
        audioManager.playSFX(outcome.mult >= 10 ? 'jackpot' : 'win');
        toast.success(`🐂 ${outcome.text}! Won ${winAmount} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error("Try again!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Instant Win 🐂</h1>
          <p className="text-muted-foreground">One click, instant results!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-16 rounded-lg border-4 border-primary">
              <p className="text-9xl">{result}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 mb-6 text-center text-sm">
          {outcomes.map((o, i) => (
            <div key={i} className="border border-border rounded p-2">
              <p className="text-2xl">{o.symbol}</p>
              <p className="text-xs text-muted-foreground">{o.mult}x</p>
            </div>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default InstantWin;