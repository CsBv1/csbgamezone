import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const RedDog = () => {
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

    const newCards = [
      Math.floor(Math.random() * 13) + 1,
      Math.floor(Math.random() * 13) + 1,
      Math.floor(Math.random() * 13) + 1
    ];
    setCards(newCards);

    setTimeout(() => {
      const [c1, c2, c3] = newCards.sort((a, b) => a - b);
      if (c3 > c1 && c3 < c2) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 In between! Won ${winAmount} credits!`);
      } else {
        toast.error("Not in between!");
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Red Dog 🐂</h1>
          <p className="text-muted-foreground">Will the third card fall between?</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {cards.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {cards.map((card, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-5xl font-bold text-primary">{card}</p>
              </div>
            ))}
          </div>
        )}

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default RedDog;
