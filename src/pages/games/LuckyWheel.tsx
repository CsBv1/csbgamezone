import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const LuckyWheel = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const prizes = [0, 25, 50, 75, 100, 150, 200, 500];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    audioManager.playSFX('spin');

    // Play tick sounds during spin
    const tickInterval = setInterval(() => {
      audioManager.playSFX('wheelTick');
    }, 150);

    setTimeout(() => {
      clearInterval(tickInterval);
      audioManager.playSFX('wheelStop');
      
      const won = prizes[Math.floor(Math.random() * prizes.length)];
      setResult(won);

      if (won > 0) {
        setCredits(prev => prev + won);
        audioManager.playSFX(won >= 200 ? 'jackpot' : 'win');
        toast.success(`🐂 Won ${won} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error("No prize this spin!");
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={goBack} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> {getBackLabel()}
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Lucky Wheel 🐂</h1>
          <p className="text-muted-foreground">Spin for instant prizes!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <div className={`inline-block bg-primary/20 p-12 rounded-full border-4 border-primary ${playing ? 'animate-spin' : ''}`}>
              <p className="text-7xl font-bold text-primary">{result}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-6 text-center text-sm text-muted-foreground">
          {prizes.map(p => (
            <div key={p} className="border border-border rounded p-2">
              {p === 0 ? "Nothing" : `${p}`}
            </div>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Spinning..." : `Spin (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default LuckyWheel;