import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const FortuneFlip = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [flips, setFlips] = useState<string[]>([]);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newFlips = Array(7).fill(0).map(() => 
      Math.random() > 0.5 ? "🐂" : "💰"
    );
    setFlips(newFlips);

    setTimeout(() => {
      const bulls = newFlips.filter(f => f === "🐂").length;
      
      if (bulls === 7) {
        const winAmount = betAmount * 50;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ALL BULLS! Won ${winAmount} credits!`);
      } else if (bulls >= 5) {
        const winAmount = betAmount * 10;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${bulls} Bulls! Won ${winAmount} credits!`);
      } else if (bulls >= 4) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`${bulls} Bulls! Won ${winAmount} credits!`);
      } else {
        toast.error(`Only ${bulls} bulls!`);
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Fortune Flip 🐂</h1>
          <p className="text-muted-foreground">Flip for bulls!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {flips.length > 0 && (
          <div className="flex gap-2 justify-center mb-6 flex-wrap">
            {flips.map((flip, i) => (
              <div key={i} className="bg-primary/20 p-4 rounded-lg border-2 border-primary">
                <p className="text-5xl">{flip}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>7 Bulls: 50x | 5-6 Bulls: 10x | 4 Bulls: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Flipping..." : `Flip (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default FortuneFlip;