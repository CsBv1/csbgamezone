import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const QuickDraw = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    audioManager.playSFX('spin');
    
    setTimeout(() => {
      const drawn = Array(10).fill(0).map(() => Math.floor(Math.random() * 20) + 1);
      setNumbers(drawn);
      
      const matches = picked.filter(p => drawn.includes(p)).length;
      
      if (matches >= 3) {
        const mult = matches === 3 ? 3 : matches === 4 ? 10 : 25;
        const winAmount = betAmount * mult;
        setCredits(prev => prev + winAmount);
        audioManager.playSFX(matches >= 4 ? 'jackpot' : 'win');
        toast.success(`🐂 ${matches} matches! Won ${winAmount} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error(`Only ${matches} matches!`);
      }
      setPlaying(false);
    }, 2000);
  };

  const togglePick = (num: number) => {
    if (playing) return;
    
    audioManager.playSFX('click');
    
    if (picked.includes(num)) {
      setPicked(picked.filter(p => p !== num));
    } else if (picked.length < 5) {
      setPicked([...picked, num]);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={goBack} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> {getBackLabel()}
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Quick Draw 🐂</h1>
          <p className="text-muted-foreground">Pick 5 numbers, match to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Selected: {picked.join(", ") || "None"} ({picked.length}/5)
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-6">
          {Array.from({length: 20}, (_, i) => i + 1).map(num => (
            <Button
              key={num}
              onClick={() => togglePick(num)}
              variant={picked.includes(num) ? "default" : "outline"}
              disabled={playing}
              size="sm"
            >
              {num}
            </Button>
          ))}
        </div>

        {numbers.length > 0 && (
          <div className="mb-6">
            <p className="text-center text-sm text-muted-foreground mb-2">Drawn Numbers:</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {numbers.map((n, i) => (
                <div key={i} className={`p-2 rounded border ${picked.includes(n) ? 'bg-green-500/30 border-green-500' : 'bg-primary/20 border-primary'}`}>
                  <p className="text-lg font-bold text-primary">{n}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>3 matches: 3x | 4 matches: 10x | 5 matches: 25x</p>
        </div>

        <Button onClick={startGame} disabled={playing || picked.length !== 5} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default QuickDraw;