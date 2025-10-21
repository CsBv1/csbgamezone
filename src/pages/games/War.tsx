import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const War = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [playerCard, setPlayerCard] = useState<number | null>(null);
  const [dealerCard, setDealerCard] = useState<number | null>(null);
  const betAmount = 50;

  const cardRanks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const pCard = Math.floor(Math.random() * 13);
      const dCard = Math.floor(Math.random() * 13);
      setPlayerCard(pCard);
      setDealerCard(dCard);

      if (pCard > dCard) {
        const winAmount = betAmount * 2;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 You won ${winAmount} credits!`);
      } else if (pCard < dCard) {
        toast.error("Dealer wins!");
      } else {
        const tieWin = Math.floor(betAmount * 1.5);
        setCredits(prev => prev + tieWin);
        toast.success(`🐂 War tie! Won ${tieWin} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">War 🐂</h1>
          <p className="text-muted-foreground">Highest card wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Card</p>
            {playerCard !== null && (
              <div className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-5xl font-bold text-primary">{cardRanks[playerCard]}</p>
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Dealer Card</p>
            {dealerCard !== null && (
              <div className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-5xl font-bold text-primary">{cardRanks[dealerCard]}</p>
              </div>
            )}
          </div>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default War;
