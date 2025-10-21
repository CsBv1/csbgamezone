import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BonusBurst = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [bubbles, setBubbles] = useState<{value: number; popped: boolean}[]>([]);
  const [total, setTotal] = useState(0);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setTotal(0);
    
    const newBubbles = Array(9).fill(0).map(() => ({
      value: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : -10,
      popped: false
    }));
    setBubbles(newBubbles);
  };

  const popBubble = (index: number) => {
    if (!playing || bubbles[index].popped) return;

    const newBubbles = [...bubbles];
    newBubbles[index].popped = true;
    setBubbles(newBubbles);

    const value = bubbles[index].value;
    const newTotal = total + value;
    setTotal(newTotal);

    if (value < 0) {
      toast.error("💥 Burst! Game over!");
      setPlaying(false);
    } else {
      toast.success(`+${value} credits!`);
      
      if (newBubbles.every(b => b.popped || b.value < 0)) {
        const winAmount = betAmount + newTotal;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 All safe bubbles popped! Won ${winAmount} credits!`);
        setPlaying(false);
      }
    }
  };

  const cashOut = () => {
    const winAmount = betAmount + total;
    setCredits(prev => prev + winAmount);
    toast.success(`🐂 Cashed out ${winAmount} credits!`);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bonus Burst 🐂</h1>
          <p className="text-muted-foreground">Pop bubbles but avoid the bursts!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-primary">Total: +{total}</p>
            <p className="text-lg text-muted-foreground">Win: {betAmount + total} credits</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {bubbles.map((bubble, i) => (
            <Button
              key={i}
              onClick={() => popBubble(i)}
              disabled={!playing || bubble.popped}
              variant={bubble.popped ? (bubble.value < 0 ? "destructive" : "default") : "outline"}
              className="h-24 text-4xl"
            >
              {bubble.popped ? (bubble.value < 0 ? "💥" : `+${bubble.value}`) : "🎈"}
            </Button>
          ))}
        </div>

        {!playing ? (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        ) : (
          <Button onClick={cashOut} size="lg" variant="outline" className="w-full" disabled={total === 0}>
            Cash Out
          </Button>
        )}
      </Card>
    </div>
  );
};

export default BonusBurst;
