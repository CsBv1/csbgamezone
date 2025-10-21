import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CosmicCrash = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [cashedOut, setCashedOut] = useState(false);
  const betAmount = 50;

  useEffect(() => {
    if (!playing || cashedOut) return;

    const interval = setInterval(() => {
      setMultiplier(prev => {
        const next = prev + 0.01;
        if (next >= crashPoint) {
          clearInterval(interval);
          toast.error(`🌠 Crashed at ${crashPoint.toFixed(2)}x!`);
          setPlaying(false);
          return crashPoint;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [playing, crashPoint, cashedOut]);

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setMultiplier(1.00);
    setCashedOut(false);
    setCrashPoint(1 + Math.random() * 9);
  };

  const cashOut = () => {
    if (!playing || cashedOut) return;
    
    setCashedOut(true);
    const winAmount = Math.floor(betAmount * multiplier);
    setCredits(prev => prev + winAmount);
    toast.success(`🐂 Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount} credits!`);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Cosmic Crash 🐂</h1>
          <p className="text-muted-foreground">Cash out before crash!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
            <p className="text-7xl font-bold text-primary">{multiplier.toFixed(2)}x</p>
          </div>
          {playing && !cashedOut && (
            <p className="text-xl mt-4">Win: {Math.floor(betAmount * multiplier)} credits</p>
          )}
        </div>

        {playing && !cashedOut ? (
          <Button onClick={cashOut} size="lg" className="w-full">
            Cash Out
          </Button>
        ) : (
          <Button onClick={play} disabled={playing} size="lg" className="w-full">
            {playing ? "Crashed!" : `Play (${betAmount} credits)`}
          </Button>
        )}
      </Card>
    </div>
  );
};

export default CosmicCrash;
