import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BullRace = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [positions, setPositions] = useState<number[]>([0, 0, 0]);
  const [choice, setChoice] = useState(0);
  const betAmount = 50;

  const bulls = ["🐂", "🐃", "🐄"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setPositions([0, 0, 0]);

    const interval = setInterval(() => {
      setPositions(prev => prev.map(p => p + Math.floor(Math.random() * 15) + 5));
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setPositions(prev => {
        const final = prev.map(p => p + Math.floor(Math.random() * 20) + 10);
        const winner = final.indexOf(Math.max(...final));
        
        if (winner === choice) {
          const winAmount = betAmount * 3;
          setCredits(c => c + winAmount);
          toast.success(`🐂 ${bulls[winner]} won! ${winAmount} credits!`);
        } else {
          toast.error(`${bulls[winner]} won!`);
        }
        setPlaying(false);
        return final;
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bull Race 🐂</h1>
          <p className="text-muted-foreground">Pick your bull to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="space-y-3 mb-6">
          {bulls.map((bull, i) => (
            <div key={i} className="flex items-center gap-4">
              <Button
                variant={choice === i ? "default" : "outline"}
                onClick={() => !playing && setChoice(i)}
                disabled={playing}
                size="sm"
              >
                {bull}
              </Button>
              <div className="flex-1 bg-primary/10 h-10 rounded relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary/30 rounded transition-all"
                  style={{ width: `${Math.min(positions[i], 100)}%` }}
                >
                  <span className="absolute right-2 top-2 text-2xl">{bull}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Racing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BullRace;