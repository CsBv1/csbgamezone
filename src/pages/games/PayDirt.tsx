import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const PayDirt = () => {
  const navigate = useNavigate();
  const { credits, loading, deductCredits, awardCredits, recordLoss } = useGameLogic("Pay Dirt");
  const [playing, setPlaying] = useState(false);
  const [digs, setDigs] = useState(0);
  const betAmount = 50;

  const dig = async () => {
    if (!playing) {
      const success = await deductCredits(betAmount);
      if (!success) return;
      setPlaying(true);
      setDigs(0);
    }

    const newDigs = digs + 1;
    setDigs(newDigs);

    const found = Math.random() > 0.6;
    if (found) {
      const winAmount = betAmount * (1 + newDigs);
      await awardCredits(winAmount);
      setPlaying(false);
    } else {
      if (newDigs >= 5) {
        await recordLoss(betAmount);
        setPlaying(false);
        toast.error("No gold found!");
      } else {
        toast(`Dig ${newDigs}...`);
      }
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Pay Dirt 🐂</h1>
          <p className="text-muted-foreground">Dig for gold!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>
        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>
        {playing && <div className="text-center mb-6"><p className="text-4xl font-bold text-primary">Digs: {digs}</p></div>}
        <Button onClick={dig} size="lg" className="w-full">{playing ? "Dig" : `Start (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default PayDirt;
