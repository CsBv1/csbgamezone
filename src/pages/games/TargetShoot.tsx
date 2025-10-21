import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const TargetShoot = () => {
  const navigate = useNavigate();
  const { credits, loading, deductCredits, awardCredits, recordLoss } = useGameLogic("Target Shoot");
  const [playing, setPlaying] = useState(false);
  const [hit, setHit] = useState<number | null>(null);
  const betAmount = 50;

  const shoot = async () => {
    const success = await deductCredits(betAmount);
    if (!success) return;
    
    setPlaying(true);

    setTimeout(async () => {
      const zone = Math.floor(Math.random() * 5) + 1;
      setHit(zone);
      const mults = [0, 2, 3, 5, 8, 15];
      const winAmount = betAmount * mults[zone];
      if (winAmount > betAmount) {
        await awardCredits(winAmount);
        toast.success(`🎯 Zone ${zone}! Won ${winAmount}!`);
      } else {
        await recordLoss(betAmount);
        toast.error(`Zone ${zone}`);
      }
      setPlaying(false);
    }, 1000);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back to Dashboard</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">Target Shoot 🐂</h1>
        <p className="text-center text-muted-foreground mb-4">Hit the bullseye!</p>
        <div className="text-2xl font-bold text-primary text-center mb-6">Credits: {credits}</div>
        <div className="mb-6 flex justify-center"><img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" /></div>
        {hit && <div className="text-center mb-6"><p className="text-8xl">🎯</p><p className="text-4xl font-bold text-primary mt-2">Zone {hit}</p></div>}
        <Button onClick={shoot} disabled={playing} size="lg" className="w-full">{playing ? "Shooting..." : `Shoot (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default TargetShoot;
