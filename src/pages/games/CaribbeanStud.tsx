import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const CaribbeanStud = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [hand, setHand] = useState<string[]>([]);
  const [dealerHand, setDealerHand] = useState<string[]>([]);
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

    const playerHand = Array(5).fill(0).map(() => drawCard());
    const dHand = Array(5).fill(0).map(() => drawCard());
    setHand(playerHand);
    setDealerHand(dHand);

    setTimeout(() => {
      const win = Math.random() > 0.45;
      if (win) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 You won ${winAmount} credits!`);
      } else {
        toast.error("Dealer wins!");
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Caribbean Stud 🐂</h1>
          <p className="text-muted-foreground">Beat the dealer's poker hand!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {hand.length > 0 && (
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">Your Hand</p>
              <div className="flex gap-2 justify-center">
                {hand.map((card, i) => (
                  <div key={i} className="bg-primary/20 p-4 rounded border-2 border-primary text-primary font-bold text-xl">
                    {card}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">Dealer Hand</p>
              <div className="flex gap-2 justify-center">
                {dealerHand.map((card, i) => (
                  <div key={i} className="bg-primary/20 p-4 rounded border-2 border-primary text-primary font-bold text-xl">
                    {card}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Dealing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default CaribbeanStud;
