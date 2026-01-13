import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { audioManager } from "@/hooks/useAudioManager";

const Keno = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);

  const numbers = Array.from({ length: 40 }, (_, i) => i + 1);
  const maxSelection = 10;

  const toggleNumber = (num: number) => {
    if (playing) return;
    audioManager.playSFX('click');
    if (selected.includes(num)) {
      setSelected(selected.filter(n => n !== num));
    } else if (selected.length < maxSelection) {
      setSelected([...selected, num]);
    } else {
      audioManager.playSFX('error');
      toast.error(`Maximum ${maxSelection} numbers!`);
    }
  };

  const play = () => {
    if (selected.length === 0) {
      audioManager.playSFX('error');
      toast.error("Select at least one number!");
      return;
    }
    if (credits < 50) {
      audioManager.playSFX('error');
      toast.error("Not enough credits!");
      return;
    }

    audioManager.playSFX('buttonPress');
    setCredits(credits - 50);
    setPlaying(true);

    const drawnNumbers: number[] = [];
    while (drawnNumbers.length < 20) {
      const num = Math.floor(Math.random() * 40) + 1;
      if (!drawnNumbers.includes(num)) {
        drawnNumbers.push(num);
      }
    }
    setDrawn(drawnNumbers);

    setTimeout(() => {
      const matches = selected.filter(n => drawnNumbers.includes(n)).length;
      const multipliers = [0, 1, 2, 3, 5, 8, 12, 20, 30, 50, 100];
      const winAmount = Math.floor(50 * (multipliers[matches] || 0));

      if (matches > 0) {
        audioManager.playSFX(matches >= 5 ? 'jackpot' : 'win');
        setCredits(c => c + winAmount);
        toast.success(`🐂 ${matches} matches! Won ${winAmount} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error("No matches this time!");
      }
      setPlaying(false);
    }, 2000);
  };

  const reset = () => {
    setSelected([]);
    setDrawn([]);
    setPlaying(false);
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
            Keno 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-16 h-16 rounded-full border-4 border-primary shadow-lg" />
          </div>

          <div className="text-center mb-6">
            <p className="text-lg font-bold">
              Selected: {selected.length}/{maxSelection} | 
              {drawn.length > 0 && ` Matches: ${selected.filter(n => drawn.includes(n)).length}`}
            </p>
          </div>

          <div className="grid grid-cols-8 gap-2 mb-6">
            {numbers.map(num => {
              const isSelected = selected.includes(num);
              const isDrawn = drawn.includes(num);
              const isMatch = isSelected && isDrawn;

              return (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                    isMatch
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white scale-110'
                      : isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isDrawn
                      ? 'bg-muted/50'
                      : 'bg-muted hover:bg-muted/80'
                  } ${!playing && !isDrawn ? 'hover:scale-105 active:scale-95' : ''}`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              variant="gold"
              size="xl"
              className="flex-1"
              onClick={play}
              disabled={playing || selected.length === 0}
            >
              {playing ? "Drawing... 🐂" : "Play (50 credits)"}
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={reset}
              disabled={playing}
            >
              Reset
            </Button>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">Payouts (per match):</h3>
            <div className="grid grid-cols-5 gap-2 text-sm text-muted-foreground">
              <span>1: 1x</span>
              <span>2: 2x</span>
              <span>3: 3x</span>
              <span>4: 5x</span>
              <span>5: 8x</span>
              <span>6: 12x</span>
              <span>7: 20x</span>
              <span>8: 30x</span>
              <span>9: 50x</span>
              <span>10: 100x 🐂</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Keno;
