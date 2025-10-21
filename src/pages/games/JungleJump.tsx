import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const JungleJump = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const betAmount = 50;

  const tiles = ["🌿", "🌿", "🌿", "🐍"];

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setPosition(0);
    setPath([]);
  };

  const jump = () => {
    if (!playing) return;

    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    const newPath = [...path, tile];
    setPath(newPath);

    if (tile === "🐍") {
      toast.error("Hit a snake!");
      setPlaying(false);
    } else {
      const newPos = position + 1;
      setPosition(newPos);
      const winAmount = betAmount * (1 + newPos * 0.3);
      
      if (newPos >= 10) {
        setCredits(prev => prev + Math.floor(winAmount));
        toast.success(`🐂 Reached the end! Won ${Math.floor(winAmount)} credits!`);
        setPlaying(false);
      } else {
        toast.success(`Safe landing! Position ${newPos}`);
      }
    }
  };

  const cashOut = () => {
    if (playing && position > 0) {
      const winAmount = Math.floor(betAmount * (1 + position * 0.3));
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out! Won ${winAmount} credits!`);
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Jungle Jump 🐂</h1>
          <p className="text-muted-foreground">Jump through the jungle!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-2xl font-bold text-primary mb-4">
              Position: {position}/10 | Win: {Math.floor(betAmount * (1 + position * 0.3))}
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {path.map((tile, i) => (
                <span key={i} className="text-4xl">{tile}</span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!playing ? (
            <Button onClick={startGame} size="lg" className="col-span-2">
              Start ({betAmount} credits)
            </Button>
          ) : (
            <>
              <Button onClick={jump} size="lg">
                Jump
              </Button>
              <Button onClick={cashOut} disabled={position === 0} variant="outline" size="lg">
                Cash Out
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default JungleJump;
