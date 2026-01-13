import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { audioManager } from "@/hooks/useAudioManager";

// Start music when entering game
audioManager.startBackgroundMusic();

const Baccarat = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [dealing, setDealing] = useState(false);
  const [playerHand, setPlayerHand] = useState<number[]>([]);
  const [bankerHand, setBankerHand] = useState<number[]>([]);
  const [bet, setBet] = useState<"player" | "banker" | "tie" | null>(null);
  const betAmount = 100;

  const drawCard = () => Math.floor(Math.random() * 10);

  const calculateTotal = (hand: number[]) => hand.reduce((a, b) => a + b, 0) % 10;

  const deal = () => {
    if (!bet) {
      audioManager.playSFX('error');
      toast.error("Place your bet first!");
      return;
    }
    if (credits < betAmount) {
      audioManager.playSFX('error');
      toast.error("Not enough credits!");
      return;
    }

    audioManager.playSFX('cardDeal');
    setDealing(true);
    setCredits(prev => prev - betAmount);

    const pHand = [drawCard(), drawCard()];
    const bHand = [drawCard(), drawCard()];
    setPlayerHand(pHand);
    setBankerHand(bHand);

    setTimeout(() => {
      const pTotal = calculateTotal(pHand);
      const bTotal = calculateTotal(bHand);

      let won = false;
      let multiplier = 0;

      if (bet === "player" && pTotal > bTotal) {
        won = true;
        multiplier = 2;
      } else if (bet === "banker" && bTotal > pTotal) {
        won = true;
        multiplier = 1.95;
      } else if (bet === "tie" && pTotal === bTotal) {
        won = true;
        multiplier = 8;
      }

      if (won) {
        audioManager.playSFX('jackpot');
        const winAmount = Math.floor(betAmount * multiplier);
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 You won ${winAmount} credits!`);
      } else {
        audioManager.playSFX('lose');
        toast.error("Better luck next time!");
      }

      setDealing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Baccarat 🐂</h1>
          <p className="text-muted-foreground">Player, Banker, or Tie?</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button onClick={() => !dealing && setBet("player")} variant={bet === "player" ? "default" : "outline"} disabled={dealing}>
            Player (2x)
          </Button>
          <Button onClick={() => !dealing && setBet("banker")} variant={bet === "banker" ? "default" : "outline"} disabled={dealing}>
            Banker (1.95x)
          </Button>
          <Button onClick={() => !dealing && setBet("tie")} variant={bet === "tie" ? "default" : "outline"} disabled={dealing}>
            Tie (8x)
          </Button>
        </div>

        {playerHand.length > 0 && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <p className="font-bold mb-2">Player</p>
              <div className="flex gap-2 justify-center mb-2">
                {playerHand.map((card, i) => (
                  <div key={i} className="w-16 h-24 bg-white rounded flex items-center justify-center text-2xl font-bold border-2 border-primary">
                    {card}
                  </div>
                ))}
              </div>
              <p className="text-3xl font-bold text-primary">{calculateTotal(playerHand)}</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-2">Banker</p>
              <div className="flex gap-2 justify-center mb-2">
                {bankerHand.map((card, i) => (
                  <div key={i} className="w-16 h-24 bg-white rounded flex items-center justify-center text-2xl font-bold border-2 border-primary">
                    {card}
                  </div>
                ))}
              </div>
              <p className="text-3xl font-bold text-primary">{calculateTotal(bankerHand)}</p>
            </div>
          </div>
        )}

        <Button onClick={deal} disabled={dealing || !bet} size="lg" className="w-full">
          {dealing ? "Dealing..." : `Deal (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default Baccarat;
