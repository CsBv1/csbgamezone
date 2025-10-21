import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const DragonTiger = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [dealing, setDealing] = useState(false);
  const [dragonCard, setDragonCard] = useState<number | null>(null);
  const [tigerCard, setTigerCard] = useState<number | null>(null);
  const [bet, setBet] = useState<"dragon" | "tiger" | "tie" | null>(null);
  const betAmount = 50;

  const deal = () => {
    if (!bet) {
      toast.error("Place your bet first!");
      return;
    }
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setDealing(true);

    setTimeout(() => {
      const dragon = Math.floor(Math.random() * 13) + 1;
      const tiger = Math.floor(Math.random() * 13) + 1;
      setDragonCard(dragon);
      setTigerCard(tiger);

      let won = false;
      let multiplier = 0;

      if (bet === "dragon" && dragon > tiger) {
        won = true;
        multiplier = 2;
      } else if (bet === "tiger" && tiger > dragon) {
        won = true;
        multiplier = 2;
      } else if (bet === "tie" && dragon === tiger) {
        won = true;
        multiplier = 8;
      }

      if (won) {
        const winAmount = betAmount * multiplier;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 You won ${winAmount} credits!`);
      } else {
        toast.error("Better luck next time!");
      }

      setDealing(false);
    }, 2000);
  };

  const getCardName = (value: number) => {
    const names = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    return names[value - 1];
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Dragon Tiger 🐂</h1>
          <p className="text-muted-foreground">Which card will be higher?</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <p className="font-bold text-red-500 mb-4 text-xl">🐉 DRAGON</p>
            {dragonCard && (
              <div className="w-32 h-44 mx-auto bg-white rounded-lg flex items-center justify-center text-6xl font-bold border-4 border-red-500">
                {getCardName(dragonCard)}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="font-bold text-orange-500 mb-4 text-xl">🐅 TIGER</p>
            {tigerCard && (
              <div className="w-32 h-44 mx-auto bg-white rounded-lg flex items-center justify-center text-6xl font-bold border-4 border-orange-500">
                {getCardName(tigerCard)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button onClick={() => !dealing && setBet("dragon")} variant={bet === "dragon" ? "default" : "outline"} disabled={dealing}>
            Dragon (2x)
          </Button>
          <Button onClick={() => !dealing && setBet("tie")} variant={bet === "tie" ? "default" : "outline"} disabled={dealing}>
            Tie (8x)
          </Button>
          <Button onClick={() => !dealing && setBet("tiger")} variant={bet === "tiger" ? "default" : "outline"} disabled={dealing}>
            Tiger (2x)
          </Button>
        </div>

        <Button onClick={deal} disabled={dealing || !bet} size="lg" className="w-full">
          {dealing ? "Dealing..." : `Deal (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default DragonTiger;
