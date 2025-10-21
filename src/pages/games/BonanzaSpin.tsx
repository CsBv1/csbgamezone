import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BonanzaSpin = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const betAmount = 50;

  const spin = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const r = Math.floor(Math.random() * 10) + 1;
      setResult(r);
      const winAmount = betAmount * r;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 ${r}x! Won ${winAmount}!`);
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back to Dashboard</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">Bonanza Spin 🐂</h1>
        <p className="text-center text-muted-foreground mb-4">Every spin wins!</p>
        <div className="text-2xl font-bold text-primary text-center mb-6">Credits: {credits}</div>
        <div className="mb-6 flex justify-center"><img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" /></div>
        {result && <div className="text-center mb-6"><div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary"><p className="text-8xl font-bold text-primary">{result}x</p></div></div>}
        <Button onClick={spin} disabled={playing} size="lg" className="w-full">{playing ? "Spinning..." : `Spin (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default BonanzaSpin;
