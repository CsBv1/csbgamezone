import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const LetItRide = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [cards, setCards] = useState<string[]>([]);
  const betAmount = 50;

  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const drawCard = () => `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const hand = Array(5).fill(0).map(() => drawCard());
    setCards(hand);

    setTimeout(() => {
      const win = Math.random() > 0.55;
      if (win) {
        const winAmount = betAmount * 4;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Winning hand! Won ${winAmount} credits!`);
      } else {
        toast.error("No winning combination!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Let It Ride 🐂</h1>
          <p className="text-muted-foreground">Build your poker hand!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {cards.length > 0 && (
          <div className="flex gap-3 justify-center mb-6">
            {cards.map((card, i) => (
              <div key={i} className="bg-primary/20 p-6 rounded-lg border-2 border-primary">
                <p className="text-3xl font-bold text-primary">{card}</p>
              </div>
            ))}
          </div>
        )}

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Dealing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default LetItRide;
