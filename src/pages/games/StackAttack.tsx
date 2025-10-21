import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const StackAttack = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("StackAttack");
  const [playing, setPlaying] = useState(false);
  const [stack, setStack] = useState(0);
  const betAmount = 50;

  const addBlock = async () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      await deductCredits(betAmount);
      setPlaying(true);
      setStack(0);
    }

    const success = Math.random() > 0.5;
    if (success) {
      const newStack = stack + 1;
      setStack(newStack);
      toast.success(`Block ${newStack} added!`);
    } else {
      const winAmount = betAmount * (1 + stack * 0.5);
      if (stack > 0) {
        await awardCredits(Math.floor(winAmount));
        toast.success(`Stack fell! Won ${Math.floor(winAmount)} credits!`);
      } else {
        toast.error("Stack fell immediately!");
      }
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Stack Attack 🐂</h1>
          <p className="text-muted-foreground">Stack blocks!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>
        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>
        {playing && <div className="text-center mb-6"><p className="text-6xl">📦</p><p className="text-4xl font-bold text-primary mt-2">{stack}</p></div>}
        <Button onClick={addBlock} size="lg" className="w-full">{playing ? "Add Block" : `Start (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default StackAttack;
