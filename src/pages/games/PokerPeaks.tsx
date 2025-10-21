import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const PokerPeaks = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [cards, setCards] = useState<string[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<"initial" | "redraw">("initial");
  const betAmount = 50;

  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const drawCard = () => `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setPhase("initial");
    setCards(Array(5).fill(0).map(() => drawCard()));
    setHeld([false, false, false, false, false]);
  };

  const toggleHold = (index: number) => {
    if (phase === "initial") {
      const newHeld = [...held];
      newHeld[index] = !newHeld[index];
      setHeld(newHeld);
    }
  };

  const redraw = () => {
    const newCards = cards.map((card, i) => held[i] ? card : drawCard());
    setCards(newCards);
    setPhase("redraw");

    setTimeout(() => {
      const win = Math.random() > 0.6;
      if (win) {
        const winAmount = betAmount * 3;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Winning hand! Won ${winAmount} credits!`);
      } else {
        toast.error("No winning combination!");
      }
      setPlaying(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Poker Peaks 🐂</h1>
          <p className="text-muted-foreground">Hold and draw for the best hand!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {cards.length > 0 && (
          <div className="flex gap-3 justify-center mb-6">
            {cards.map((card, i) => (
              <div key={i} className="text-center">
                <Button
                  variant={held[i] ? "default" : "outline"}
                  onClick={() => toggleHold(i)}
                  disabled={phase !== "initial"}
                  className="p-6 h-auto mb-2"
                >
                  <p className="text-3xl font-bold">{card}</p>
                </Button>
                {held[i] && phase === "initial" && (
                  <p className="text-xs text-primary font-bold">HELD</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!playing ? (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        ) : phase === "initial" ? (
          <Button onClick={redraw} size="lg" className="w-full">
            Draw
          </Button>
        ) : (
          <div className="text-center text-muted-foreground">Evaluating hand...</div>
        )}
      </Card>
    </div>
  );
};

export default PokerPeaks;
