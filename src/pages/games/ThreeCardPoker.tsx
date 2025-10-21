import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const ThreeCardPoker = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [dealerHand, setDealerHand] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const betAmount = 75;

  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const drawCard = () => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return `${value}${suit}`;
  };

  const deal = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlayerHand([drawCard(), drawCard(), drawCard()]);
    setDealerHand([drawCard(), drawCard(), drawCard()]);
    setRevealed(false);
  };

  const play = () => {
    setRevealed(true);
    const win = Math.random() > 0.45;
    
    if (win) {
      const winAmount = betAmount * 2.5;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 You won ${winAmount} credits!`);
    } else {
      toast.error("Dealer wins!");
    }
  };

  const fold = () => {
    setPlayerHand([]);
    setDealerHand([]);
    toast.error("You folded!");
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">3-Card Poker 🐂</h1>
          <p className="text-muted-foreground">Play or fold your hand!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playerHand.length > 0 && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-center font-bold mb-3">Your Hand</p>
              <div className="flex gap-2 justify-center">
                {playerHand.map((card, i) => (
                  <div key={i} className={`w-20 h-28 bg-white rounded flex flex-col items-center justify-center text-xl font-bold border-2 border-primary ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}>
                    <div>{card.slice(0, -1)}</div>
                    <div className="text-3xl">{card.slice(-1)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-center font-bold mb-3">Dealer Hand</p>
              <div className="flex gap-2 justify-center">
                {revealed ? (
                  dealerHand.map((card, i) => (
                    <div key={i} className={`w-20 h-28 bg-white rounded flex flex-col items-center justify-center text-xl font-bold border-2 border-primary ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}>
                      <div>{card.slice(0, -1)}</div>
                      <div className="text-3xl">{card.slice(-1)}</div>
                    </div>
                  ))
                ) : (
                  Array(3).fill(null).map((_, i) => (
                    <div key={i} className="w-20 h-28 bg-gradient-to-br from-primary to-primary/50 rounded border-2 border-primary"></div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {playerHand.length === 0 ? (
          <Button onClick={deal} size="lg" className="w-full">
            Deal ({betAmount} credits)
          </Button>
        ) : !revealed ? (
          <div className="flex gap-3">
            <Button onClick={play} size="lg" className="flex-1">
              Play
            </Button>
            <Button onClick={fold} size="lg" variant="outline" className="flex-1">
              Fold
            </Button>
          </div>
        ) : (
          <Button onClick={() => { setPlayerHand([]); setDealerHand([]); }} size="lg" className="w-full">
            New Hand
          </Button>
        )}
      </Card>
    </div>
  );
};

export default ThreeCardPoker;
