import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

const TreasureHunt = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<string[]>(new Array(16).fill(""));
  const [totalWin, setTotalWin] = useState(0);
  const [picksLeft, setPicksLeft] = useState(5);
  const betAmount = 50;

  const prizes = ["💎", "💰", "👑", "⭐", "💣"];

  const startGame = () => {
    if (credits < betAmount) {
      audioManager.playSFX('error');
      toast.error("Not enough credits!");
      return;
    }

    audioManager.playSFX('buttonPress');
    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setRevealed(new Array(16).fill(""));
    setTotalWin(0);
    setPicksLeft(5);
  };

  const pick = (index: number) => {
    if (!playing || revealed[index] || picksLeft === 0) return;

    audioManager.playSFX('cardFlip');
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    const newRevealed = [...revealed];
    newRevealed[index] = prize;
    setRevealed(newRevealed);

    if (prize === "💣") {
      audioManager.playSFX('lose');
      toast.error("Hit a bomb!");
      setPlaying(false);
      if (totalWin > 0) {
        setCredits(prev => prev + totalWin);
      }
    } else {
      audioManager.playSFX('collect');
      const winValue = prize === "💎" ? 100 : prize === "👑" ? 75 : prize === "💰" ? 50 : 25;
      setTotalWin(prev => prev + winValue);
      const newPicks = picksLeft - 1;
      setPicksLeft(newPicks);
      
      if (newPicks === 0) {
        audioManager.playSFX('jackpot');
        setCredits(prev => prev + totalWin + winValue);
        toast.success(`🐂 Completed! Won ${totalWin + winValue} credits!`);
        setPlaying(false);
      }
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Treasure Hunt 🐂</h1>
          <p className="text-muted-foreground">Find treasures, avoid bombs!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-xl font-bold text-primary">
              Picks Left: {picksLeft} | Total: {totalWin} credits
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          {Array(16).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => pick(i)}
              disabled={!playing || revealed[i] !== ""}
              variant={revealed[i] ? "default" : "outline"}
              className="h-20 text-4xl"
            >
              {revealed[i] || "❓"}
            </Button>
          ))}
        </div>

        {!playing && (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        )}
      </Card>
    </div>
  );
};

export default TreasureHunt;
