import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const TexasHoldem = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [dealerCards, setDealerCards] = useState<string[]>([]);
  const [stage, setStage] = useState<"bet" | "flop" | "turn" | "river" | "showdown">("bet");
  const betAmount = 100;

  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const drawCard = () => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return `${value}${suit}`;
  };

  const dealInitial = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlayerCards([drawCard(), drawCard()]);
    setDealerCards([drawCard(), drawCard()]);
    setCommunityCards([]);
    setStage("flop");
  };

  const nextStage = () => {
    if (stage === "flop") {
      setCommunityCards([drawCard(), drawCard(), drawCard()]);
      setStage("turn");
    } else if (stage === "turn") {
      setCommunityCards(prev => [...prev, drawCard()]);
      setStage("river");
    } else if (stage === "river") {
      setCommunityCards(prev => [...prev, drawCard()]);
      setStage("showdown");
      checkWin();
    }
  };

  const checkWin = () => {
    const win = Math.random() > 0.5;
    if (win) {
      const winAmount = betAmount * 2;
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 You won ${winAmount} credits!`);
    } else {
      toast.error("Dealer wins!");
    }
  };

  const fold = () => {
    setStage("bet");
    toast.error("You folded!");
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Texas Hold'em 🐂</h1>
          <p className="text-muted-foreground">Beat the dealer!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {communityCards.length > 0 && (
          <div className="mb-6">
            <p className="text-center font-bold mb-2">Community Cards</p>
            <div className="flex gap-2 justify-center">
              {communityCards.map((card, i) => (
                <div key={i} className={`w-16 h-24 bg-white rounded flex flex-col items-center justify-center text-xl font-bold border-2 border-primary ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}>
                  <div>{card.slice(0, -1)}</div>
                  <div className="text-2xl">{card.slice(-1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {playerCards.length > 0 && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-center font-bold mb-2">Your Cards</p>
              <div className="flex gap-2 justify-center">
                {playerCards.map((card, i) => (
                  <div key={i} className={`w-16 h-24 bg-white rounded flex flex-col items-center justify-center text-xl font-bold border-2 border-primary ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}>
                    <div>{card.slice(0, -1)}</div>
                    <div className="text-2xl">{card.slice(-1)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-center font-bold mb-2">Dealer Cards</p>
              <div className="flex gap-2 justify-center">
                {stage === "showdown" ? (
                  dealerCards.map((card, i) => (
                    <div key={i} className={`w-16 h-24 bg-white rounded flex flex-col items-center justify-center text-xl font-bold border-2 border-primary ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}>
                      <div>{card.slice(0, -1)}</div>
                      <div className="text-2xl">{card.slice(-1)}</div>
                    </div>
                  ))
                ) : (
                  Array(2).fill(null).map((_, i) => (
                    <div key={i} className="w-16 h-24 bg-gradient-to-br from-primary to-primary/50 rounded border-2 border-primary"></div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {stage === "bet" ? (
          <Button onClick={dealInitial} size="lg" className="w-full">
            Deal ({betAmount} credits)
          </Button>
        ) : stage !== "showdown" ? (
          <div className="flex gap-3">
            <Button onClick={nextStage} size="lg" className="flex-1">
              {stage === "flop" ? "See Flop" : stage === "turn" ? "See Turn" : "See River"}
            </Button>
            <Button onClick={fold} size="lg" variant="outline" className="flex-1">
              Fold
            </Button>
          </div>
        ) : (
          <Button onClick={() => setStage("bet")} size="lg" className="w-full">
            New Hand
          </Button>
        )}
      </Card>
    </div>
  );
};

export default TexasHoldem;
