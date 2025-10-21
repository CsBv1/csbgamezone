import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const PrizePath = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [path, setPath] = useState<number[]>([]);
  const betAmount = 50;

  const pickPath = (dir: number) => {
    if (!playing && path.length === 0) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      setCredits(prev => prev - betAmount);
      setPlaying(true);
    }

    const newPath = [...path, dir];
    setPath(newPath);

    const win = Math.random() > 0.4;
    if (win && newPath.length < 5) {
      toast.success(`Step ${newPath.length}!`);
    } else {
      const winAmount = betAmount * (1 + newPath.length);
      if (win) {
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Prize! Won ${winAmount}!`);
      } else {
        toast.error("Dead end!");
      }
      setPlaying(false);
      setPath([]);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back to Dashboard</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">Prize Path 🐂</h1>
        <p className="text-center text-muted-foreground mb-4">Choose your path!</p>
        <div className="text-2xl font-bold text-primary text-center mb-6">Credits: {credits}</div>
        <div className="mb-6 flex justify-center"><img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" /></div>
        {playing && <div className="text-center mb-6"><p className="text-4xl font-bold text-primary">Step: {path.length}/5</p></div>}
        <div className="grid grid-cols-3 gap-4"><Button onClick={() => pickPath(0)} size="lg">⬅️ Left</Button><Button onClick={() => pickPath(1)} size="lg">⬆️ Up</Button><Button onClick={() => pickPath(2)} size="lg">➡️ Right</Button></div>
      </Card>
    </div>
  );
};

export default PrizePath;
