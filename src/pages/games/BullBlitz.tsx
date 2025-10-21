import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BullBlitz = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const points = Math.floor(Math.random() * 100) + 1;
      setScore(points);
      if (points >= 75) {
        const winAmount = betAmount * 5;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${points}pts! Won ${winAmount}!`);
      } else if (points >= 50) {
        const winAmount = betAmount * 2;
        setCredits(prev => prev + winAmount);
        toast.success(`${points}pts! Won ${winAmount}!`);
      } else {
        toast.error(`Only ${points}pts!`);
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">Bull Blitz 🐂</h1>
        <p className="text-center text-muted-foreground mb-4">Score big!</p>
        <div className="text-2xl font-bold text-primary text-center mb-6">Credits: {credits}</div>
        <div className="mb-6 flex justify-center"><img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" /></div>
        {score > 0 && <div className="text-center mb-6"><div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary"><p className="text-6xl font-bold text-primary">{score}</p></div></div>}
        <Button onClick={play} disabled={playing} size="lg" className="w-full">{playing ? "Playing..." : `Play (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default BullBlitz;
