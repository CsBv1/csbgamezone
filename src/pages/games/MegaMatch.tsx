import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const MegaMatch = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const betAmount = 50;

  const symbolList = ["🐂", "💰", "💎", "🌟", "🔥", "⚡", "👑", "🎰"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    audioManager.playSFX('spin');

    const newSymbols = Array(5).fill(0).map(() => 
      symbolList[Math.floor(Math.random() * symbolList.length)]
    );
    setSymbols(newSymbols);

    setTimeout(() => {
      const counts: { [key: string]: number } = {};
      newSymbols.forEach(s => counts[s] = (counts[s] || 0) + 1);
      const maxMatch = Math.max(...Object.values(counts));
      
      if (maxMatch === 5) {
        const winAmount = betAmount * 100;
        setCredits(prev => prev + winAmount);
        audioManager.playSFX('jackpot');
        toast.success(`🐂 MEGA MATCH! Won ${winAmount} credits!`);
      } else if (maxMatch === 4) {
        const winAmount = betAmount * 20;
        setCredits(prev => prev + winAmount);
        audioManager.playSFX('jackpot');
        toast.success(`🐂 4 Match! Won ${winAmount} credits!`);
      } else if (maxMatch === 3) {
        const winAmount = betAmount * 5;
        setCredits(prev => prev + winAmount);
        audioManager.playSFX('win');
        toast.success(`3 Match! Won ${winAmount} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error("No match!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Mega Match 🐂</h1>
          <p className="text-muted-foreground">Match more for mega wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {symbols.length > 0 && (
          <div className="flex gap-3 justify-center mb-6">
            {symbols.map((symbol, i) => (
              <div key={i} className={`bg-primary/20 p-6 rounded-lg border-2 border-primary ${playing ? 'animate-bounce' : ''}`}>
                <p className="text-5xl">{symbol}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>5 Match: 100x | 4 Match: 20x | 3 Match: 5x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Matching..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default MegaMatch;