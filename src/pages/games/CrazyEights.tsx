import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CrazyEights = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [cards, setCards] = useState<number[]>([]);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newCards = Array(8).fill(0).map(() => Math.floor(Math.random() * 13) + 1);
    setCards(newCards);

    setTimeout(() => {
      const eights = newCards.filter(c => c === 8).length;
      const sum = newCards.reduce((a, b) => a + b, 0);
      
      if (eights >= 3) {
        const winAmount = betAmount * (eights * 5);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${eights} Eights! Won ${winAmount} credits!`);
      } else if (sum === 88) {
        const winAmount = betAmount * 20;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Sum is 88! Won ${winAmount} credits!`);
      } else if (sum >= 80) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`High sum! Won ${winAmount} credits!`);
      } else {
        toast.error(`Sum: ${sum} - Try again!`);
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Crazy Eights 🐂</h1>
          <p className="text-muted-foreground">Collect eights and high sums!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {cards.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {cards.map((card, i) => (
                <div key={i} className="bg-primary/20 p-4 rounded-lg border-2 border-primary text-center">
                  <p className="text-4xl font-bold text-primary">{card}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xl font-bold text-primary">
              Sum: {cards.reduce((a, b) => a + b, 0)} | Eights: {cards.filter(c => c === 8).length}
            </p>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>3+ Eights: 15x+ | Sum 88: 20x | Sum 80+: 3x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Dealing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default CrazyEights;