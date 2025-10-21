import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const GoldenEgg = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(12).fill(false));
  const [eggs, setEggs] = useState<string[]>([]);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setRevealed(new Array(12).fill(false));
    
    const newEggs = new Array(12).fill("💰");
    const goldenIndex = Math.floor(Math.random() * 12);
    newEggs[goldenIndex] = "🥇";
    setEggs(newEggs);
  };

  const pickEgg = (index: number) => {
    if (!playing || revealed[index]) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (eggs[index] === "🥇") {
      const winAmount = betAmount * 10;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 GOLDEN EGG! Won ${winAmount} credits!`);
      setPlaying(false);
      setRevealed(new Array(12).fill(true));
    } else if (newRevealed.filter(r => r).length >= 3) {
      toast.error("No golden egg found!");
      setPlaying(false);
      setRevealed(new Array(12).fill(true));
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Golden Egg 🐂</h1>
          <p className="text-muted-foreground">Find the golden egg in 3 tries!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array(12).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => pickEgg(i)}
              disabled={!playing || revealed[i]}
              size="lg"
              variant={revealed[i] ? "default" : "outline"}
              className="h-20 text-4xl"
            >
              {revealed[i] ? eggs[i] : "🥚"}
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

export default GoldenEgg;
