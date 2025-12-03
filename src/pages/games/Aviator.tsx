import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const Aviator = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [credits, setCredits] = useState(1000);
  const [flying, setFlying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.00);
  const [cashedOut, setCashedOut] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  const betAmount = 50;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (flying && !cashedOut) {
      interval = setInterval(() => {
        setMultiplier(m => {
          const newM = m + 0.05;
          if (newM >= crashPoint) {
            setFlying(false);
            toast.error(`Crashed at ${crashPoint.toFixed(2)}x!`);
            return crashPoint;
          }
          return newM;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [flying, cashedOut, crashPoint]);

  const startFlight = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setFlying(true);
    setCashedOut(false);
    setMultiplier(1.00);
    setCrashPoint(1 + Math.random() * 10);
  };

  const cashOut = () => {
    if (!flying || cashedOut) return;
    
    setCashedOut(true);
    setFlying(false);
    const winAmount = Math.floor(betAmount * multiplier);
    setCredits(prev => prev + winAmount);
    toast.success(`🐂 Cashed out at ${multiplier.toFixed(2)}x! Won ${winAmount} credits!`);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={goBack} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> {getBackLabel()}
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Aviator 🐂</h1>
          <p className="text-muted-foreground">Cash out before the crash!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="bg-gradient-to-t from-blue-900 to-sky-300 rounded-lg p-12 mb-6 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="text-8xl font-bold text-white mb-4">{multiplier.toFixed(2)}x</div>
          <div 
            className="text-6xl absolute bottom-4 transition-all duration-100"
            style={{ left: `${Math.min(multiplier * 5, 90)}%` }}
          >
            ✈️
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={startFlight} disabled={flying} size="lg" className="flex-1">
            {flying ? "Flying..." : `Start Flight (${betAmount} credits)`}
          </Button>
          <Button onClick={cashOut} disabled={!flying || cashedOut} size="lg" className="flex-1" variant="outline">
            Cash Out
          </Button>
        </div>

        <div className="text-center mt-4 text-sm text-muted-foreground">
          <p>Win: {Math.floor(betAmount * multiplier)} credits</p>
        </div>
      </Card>
    </div>
  );
};

export default Aviator;
