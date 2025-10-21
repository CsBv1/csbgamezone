import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const RaceDay = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [choice, setChoice] = useState(1);
  const betAmount = 50;

  const race = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const w = Math.floor(Math.random() * 5) + 1;
      setWinner(w);
      if (w === choice) {
        const winAmount = betAmount * 5;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Bull ${w} wins! Won ${winAmount}!`);
      } else {
        toast.error(`Bull ${w} won!`);
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back to Dashboard</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">Race Day 🐂</h1>
        <p className="text-center text-muted-foreground mb-4">Pick the winning bull!</p>
        <div className="text-2xl font-bold text-primary text-center mb-6">Credits: {credits}</div>
        <div className="mb-6 flex justify-center"><img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" /></div>
        {winner && <div className="text-center mb-6"><p className="text-6xl">🏁</p><p className="text-4xl font-bold text-primary mt-2">Bull #{winner}</p></div>}
        <div className="grid grid-cols-5 gap-2 mb-6">{[1,2,3,4,5].map(n => <Button key={n} variant={choice === n ? "default" : "outline"} onClick={() => !playing && setChoice(n)} size="lg">{n}</Button>)}</div>
        <Button onClick={race} disabled={playing} size="lg" className="w-full">{playing ? "Racing..." : `Race (${betAmount})`}</Button>
      </Card>
    </div>
  );
};

export default RaceDay;
