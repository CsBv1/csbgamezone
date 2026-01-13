import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { audioManager } from "@/hooks/useAudioManager";

const VideoPoker = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [hand, setHand] = useState<string[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [dealt, setDealt] = useState(false);
  const betAmount = 50;

  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const drawCard = () => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return `${value}${suit}`;
  };

  const deal = () => {
    if (credits < betAmount) {
      audioManager.playSFX('error');
      toast.error("Not enough credits!");
      return;
    }

    audioManager.playSFX('cardDeal');
    setCredits(prev => prev - betAmount);
    const newHand = Array(5).fill(null).map(() => drawCard());
    setHand(newHand);
    setHeld([false, false, false, false, false]);
    setDealt(true);
  };

  const draw = () => {
    audioManager.playSFX('cardFlip');
    const newHand = hand.map((card, i) => held[i] ? card : drawCard());
    setHand(newHand);
    checkWin(newHand);
    setDealt(false);
  };

  const toggleHold = (index: number) => {
    audioManager.playSFX('click');
    const newHeld = [...held];
    newHeld[index] = !newHeld[index];
    setHeld(newHeld);
  };

  const checkWin = (finalHand: string[]) => {
    const values = finalHand.map(c => c.slice(0, -1));
    const valueCounts = values.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    let winAmount = 0;

    if (counts[0] === 4) winAmount = betAmount * 25;
    else if (counts[0] === 3 && counts[1] === 2) winAmount = betAmount * 9;
    else if (counts[0] === 3) winAmount = betAmount * 3;
    else if (counts[0] === 2 && counts[1] === 2) winAmount = betAmount * 2;
    else if (counts[0] === 2) winAmount = betAmount * 1;

    if (winAmount > 0) {
      audioManager.playSFX(winAmount >= betAmount * 9 ? 'jackpot' : 'win');
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Won ${winAmount} credits!`);
    } else {
      audioManager.playSFX('lose');
      toast.error("No winning hand!");
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Video Poker 🐂</h1>
          <p className="text-muted-foreground">Hold cards and draw!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {hand.length > 0 && (
          <div className="flex gap-3 justify-center mb-6">
            {hand.map((card, i) => (
              <div key={i} className="text-center">
                <button
                  onClick={() => dealt && toggleHold(i)}
                  disabled={!dealt}
                  className={`w-20 h-28 bg-white rounded-lg flex flex-col items-center justify-center text-2xl font-bold border-4 transition-all ${
                    held[i] ? "border-primary scale-105" : "border-gray-300"
                  } ${card.includes("♥") || card.includes("♦") ? "text-red-600" : "text-black"}`}
                >
                  <div>{card.slice(0, -1)}</div>
                  <div>{card.slice(-1)}</div>
                </button>
                {dealt && <p className="text-xs mt-1 font-bold">{held[i] ? "HELD" : ""}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={deal} disabled={dealt} size="lg" className="flex-1">
            Deal ({betAmount} credits)
          </Button>
          <Button onClick={draw} disabled={!dealt} size="lg" className="flex-1">
            Draw
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VideoPoker;
