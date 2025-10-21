import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const LuckyLadder = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const betAmount = 50;

  const steps = [1, 1.5, 2, 3, 5, 8, 12, 20, 30, 50];

  const climb = () => {
    if (!playing) {
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setCurrentStep(0);
      setMultiplier(1);
    }

    if (currentStep >= steps.length - 1) {
      const winAmount = Math.floor(betAmount * steps[currentStep]);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 TOP! Won ${winAmount} credits!`);
      setPlaying(false);
      return;
    }

    const success = Math.random() > 0.25;
    if (success) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      setMultiplier(steps[newStep]);
      toast.success(`Step ${newStep + 1}! ${steps[newStep]}x`);
    } else {
      toast.error("Fell off the ladder!");
      setPlaying(false);
    }
  };

  const cashOut = () => {
    if (playing && currentStep > 0) {
      const winAmount = Math.floor(betAmount * steps[currentStep]);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out! Won ${winAmount} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Lucky Ladder 🐂</h1>
          <p className="text-muted-foreground">Climb to the top!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="mb-6 space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`p-3 rounded border-2 ${
                i === currentStep && playing
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < currentStep && playing
                  ? "bg-primary/20 border-primary/50"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex justify-between">
                <span>Step {i + 1}</span>
                <span className="font-bold">{step}x</span>
              </div>
            </div>
          )).reverse()}
        </div>

        {playing && currentStep > 0 && (
          <div className="text-center mb-4">
            <p className="text-xl font-bold text-primary">
              Current: {Math.floor(betAmount * steps[currentStep])} credits
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={climb} size="lg">
            {playing ? "Climb" : `Start (${betAmount})`}
          </Button>
          <Button onClick={cashOut} disabled={!playing || currentStep === 0} variant="outline" size="lg">
            Cash Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LuckyLadder;
