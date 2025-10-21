import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BonanzaBalls = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [balls, setBalls] = useState<string[]>([]);
  const betAmount = 50;

  const colors = ["🔴", "🔵", "🟢", "🟡", "⚫"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newBalls = Array(6).fill(0).map(() => 
      colors[Math.floor(Math.random() * colors.length)]
    );
    setBalls(newBalls);

    setTimeout(() => {
      const counts = colors.map(color => 
        newBalls.filter(b => b === color).length
      );
      const maxCount = Math.max(...counts);
      
      if (maxCount >= 4) {
        const mult = maxCount === 4 ? 5 : maxCount === 5 ? 15 : 50;
        const winAmount = betAmount * mult;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${maxCount} matching! Won ${winAmount} credits!`);
      } else if (counts.every(c => c === 0 || c === 1)) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 All different! Won ${winAmount} credits!`);
      } else {
        toast.error("No winning combination!");
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bonanza Balls 🐂</h1>
          <p className="text-muted-foreground">Match colors for bonanza wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {balls.length > 0 && (
          <div className="flex gap-3 justify-center mb-6 flex-wrap">
            {balls.map((ball, i) => (
              <div key={i} className="bg-primary/20 p-6 rounded-full border-4 border-primary">
                <p className="text-5xl">{ball}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>4 same: 5x | 5 same: 15x | 6 same: 50x | All different: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BonanzaBalls;