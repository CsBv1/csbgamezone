import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const AlienInvasion = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [aliens, setAliens] = useState<string[]>(new Array(15).fill(""));
  const [score, setScore] = useState(0);
  const betAmount = 50;

  const alienTypes = ["👾", "👽", "🛸", "💥"];

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setAliens(new Array(15).fill(""));
    setScore(0);
  };

  const shoot = (index: number) => {
    if (!playing || aliens[index]) return;

    const alien = alienTypes[Math.floor(Math.random() * alienTypes.length)];
    const newAliens = [...aliens];
    newAliens[index] = alien;
    setAliens(newAliens);

    if (alien === "💥") {
      toast.error("Hit a bomb!");
      setPlaying(false);
      if (score > 0) {
        setCredits(prev => prev + score);
      }
    } else {
      const points = alien === "🛸" ? 100 : alien === "👽" ? 50 : 25;
      setScore(prev => prev + points);
      
      const shotsLeft = newAliens.filter(a => !a).length;
      if (shotsLeft === 0) {
        const totalWin = score + points;
        setCredits(prev => prev + totalWin);
        toast.success(`🐂 All destroyed! Won ${totalWin} credits!`);
        setPlaying(false);
      } else {
        toast.success(`+${points} points!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Alien Invasion 🐂</h1>
          <p className="text-muted-foreground">Shoot aliens, avoid bombs!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-primary">Score: {score}</p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 mb-6">
          {Array(15).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => shoot(i)}
              disabled={!playing || aliens[i] !== ""}
              variant={aliens[i] ? "default" : "outline"}
              className="h-16 text-4xl"
            >
              {aliens[i] || "🎯"}
            </Button>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>🛸 100 | 👽 50 | 👾 25 | 💥 BOMB</p>
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

export default AlienInvasion;
