import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CashCascade = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [multipliers, setMultipliers] = useState<number[]>([]);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const mults = [1, 1.5, 2, 3, 5, 10];
    const cascade = Array(5).fill(0).map(() => 
      mults[Math.floor(Math.random() * mults.length)]
    );
    setMultipliers(cascade);

    setTimeout(() => {
      const totalMult = cascade.reduce((a, b) => a * b, 1);
      const winAmount = Math.floor(betAmount * totalMult);
      
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 ${totalMult.toFixed(1)}x multiplier! Won ${winAmount} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Cash Cascade 🐂</h1>
          <p className="text-muted-foreground">Multiply your wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {multipliers.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-3 justify-center mb-4">
              {multipliers.map((mult, i) => (
                <div key={i} className="bg-primary/20 p-4 rounded-lg border-2 border-primary">
                  <p className="text-3xl font-bold text-primary">{mult}x</p>
                </div>
              ))}
            </div>
            <p className="text-center text-2xl font-bold text-primary">
              Total: {multipliers.reduce((a, b) => a * b, 1).toFixed(1)}x
            </p>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>Multipliers cascade and multiply together!</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Cascading..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default CashCascade;