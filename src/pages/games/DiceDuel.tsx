import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const DiceDuel = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [playerDice, setPlayerDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const betAmount = 50;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const pDice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    const dDice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    
    setPlayerDice(pDice);
    setDealerDice(dDice);

    setTimeout(() => {
      const playerTotal = pDice.reduce((a, b) => a + b, 0);
      const dealerTotal = dDice.reduce((a, b) => a + b, 0);

      if (playerTotal > dealerTotal) {
        const winAmount = betAmount * 2;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 You won! ${playerTotal} vs ${dealerTotal} - Won ${winAmount} credits!`);
      } else if (playerTotal === dealerTotal) {
        setCredits(prev => prev + betAmount);
        toast("Tie! Bet returned");
      } else {
        toast.error(`Dealer wins! ${dealerTotal} vs ${playerTotal}`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Dice Duel 🐂</h1>
          <p className="text-muted-foreground">Beat the dealer's roll!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <p className="text-lg font-bold mb-4">Your Dice</p>
            <div className="flex gap-3 justify-center">
              {playerDice.map((die, i) => (
                <div key={i} className="bg-primary/20 p-6 rounded-lg border-2 border-primary">
                  <p className="text-5xl font-bold text-primary">{die}</p>
                </div>
              ))}
            </div>
            {playerDice.length > 0 && (
              <p className="text-2xl font-bold text-primary mt-3">
                Total: {playerDice.reduce((a, b) => a + b, 0)}
              </p>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-bold mb-4">Dealer Dice</p>
            <div className="flex gap-3 justify-center">
              {dealerDice.map((die, i) => (
                <div key={i} className="bg-muted/50 p-6 rounded-lg border-2 border-border">
                  <p className="text-5xl font-bold">{die}</p>
                </div>
              ))}
            </div>
            {dealerDice.length > 0 && (
              <p className="text-2xl font-bold mt-3">
                Total: {dealerDice.reduce((a, b) => a + b, 0)}
              </p>
            )}
          </div>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Rolling..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default DiceDuel;
