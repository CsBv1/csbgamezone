import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const RapidRoll = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [rolls, setRolls] = useState<number[]>([]);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newRolls = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    setRolls(newRolls);

    setTimeout(() => {
      const sum = newRolls.reduce((a, b) => a + b, 0);
      const sixes = newRolls.filter(r => r === 6).length;
      
      if (sixes === 5) {
        const winAmount = betAmount * 50;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ALL SIXES! Won ${winAmount} credits!`);
      } else if (sum >= 25) {
        const winAmount = betAmount * 10;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 High roll ${sum}! Won ${winAmount} credits!`);
      } else if (sum >= 20) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`Good roll ${sum}! Won ${winAmount} credits!`);
      } else {
        toast.error(`Sum ${sum} - Too low!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Rapid Roll 🐂</h1>
          <p className="text-muted-foreground">Roll high to win big!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {rolls.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-3 justify-center">
              {rolls.map((roll, i) => (
                <div key={i} className="bg-primary/20 p-6 rounded-lg border-2 border-primary">
                  <p className="text-5xl font-bold text-primary">{roll}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-4 text-2xl font-bold text-primary">
              Total: {rolls.reduce((a, b) => a + b, 0)}
            </p>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>All 6s: 50x | 25+: 10x | 20-24: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Rolling..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default RapidRoll;