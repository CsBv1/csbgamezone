import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CashClimb = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [steps, setSteps] = useState<boolean[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const betAmount = 50;

  const totalSteps = 8;
  const multipliers = [1, 1.5, 2, 3, 5, 8, 12, 20];

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setCurrentStep(0);
    setSteps(Array(totalSteps).fill(false).map(() => Math.random() > 0.5));
  };

  const climb = (safe: boolean) => {
    if (!playing) return;

    if (steps[currentStep] === safe) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      toast.success(`✅ Correct! Step ${newStep}/${totalSteps}`);

      if (newStep >= totalSteps) {
        const winAmount = betAmount * multipliers[newStep - 1];
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Reached the top! Won ${winAmount} credits!`);
        setPlaying(false);
      }
    } else {
      toast.error("❌ Wrong path! Game over");
      setPlaying(false);
    }
  };

  const cashOut = () => {
    if (playing && currentStep > 0) {
      const winAmount = betAmount * multipliers[currentStep - 1];
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out ${winAmount} credits!`);
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Cash Climb 🐂</h1>
          <p className="text-muted-foreground">Choose the right path to the top!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-primary">Step {currentStep}/{totalSteps}</p>
            <p className="text-xl mt-2">Current: {multipliers[currentStep]}x</p>
            {currentStep > 0 && (
              <p className="text-lg text-muted-foreground">Win: {betAmount * multipliers[currentStep - 1]} credits</p>
            )}
          </div>
        )}

        {playing ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button onClick={() => climb(true)} size="lg" className="h-24">
                ⬅️ Left Path
              </Button>
              <Button onClick={() => climb(false)} size="lg" className="h-24">
                Right Path ➡️
              </Button>
            </div>
            <Button onClick={cashOut} disabled={currentStep === 0} variant="outline" size="lg" className="w-full">
              Cash Out
            </Button>
          </>
        ) : (
          <Button onClick={startGame} size="lg" className="w-full">
            Start Climb ({betAmount} credits)
          </Button>
        )}
      </Card>
    </div>
  );
};

export default CashClimb;
