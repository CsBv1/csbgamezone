import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const WheelOfFortune = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const prizes = [10, 50, 100, 5, 200, 0, 25, 500, 10, 75, 0, 150];

  const spin = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setSpinning(true);
    
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + (360 * spins) + Math.random() * 360;
    setRotation(finalRotation);

    setTimeout(() => {
      const segmentAngle = 360 / prizes.length;
      const normalizedRotation = finalRotation % 360;
      const prizeIndex = Math.floor((360 - normalizedRotation) / segmentAngle) % prizes.length;
      const prize = prizes[prizeIndex];

      setResult(prize);
      if (prize > 0) {
        setCredits(prev => prev + prize);
        toast.success(`🐂 You won ${prize} credits!`);
      } else {
        toast.error("Better luck next time!");
      }
      setSpinning(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Wheel of Fortune 🐂</h1>
          <p className="text-muted-foreground">Spin the wheel and win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="relative w-80 h-80 mx-auto mb-6">
          <div 
            className="w-full h-full rounded-full border-8 border-primary transition-transform duration-[4000ms] ease-out"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(
                from 0deg,
                hsl(var(--primary)) 0deg 30deg,
                hsl(var(--secondary)) 30deg 60deg,
                hsl(var(--accent)) 60deg 90deg,
                hsl(var(--primary)) 90deg 120deg,
                hsl(var(--secondary)) 120deg 150deg,
                hsl(var(--accent)) 150deg 180deg,
                hsl(var(--primary)) 180deg 210deg,
                hsl(var(--secondary)) 210deg 240deg,
                hsl(var(--accent)) 240deg 270deg,
                hsl(var(--primary)) 270deg 300deg,
                hsl(var(--secondary)) 300deg 330deg,
                hsl(var(--accent)) 330deg 360deg
              )`
            }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background rounded-full border-4 border-primary flex items-center justify-center text-2xl font-bold">
              🐂
            </div>
          </div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-primary"></div>
          </div>
        </div>

        {result !== null && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-primary">Won: {result} credits!</p>
          </div>
        )}

        <Button onClick={spin} disabled={spinning} size="lg" className="w-full">
          {spinning ? "Spinning..." : `Spin (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default WheelOfFortune;
