import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const HighLow = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState(7);
  const [nextCard, setNextCard] = useState<number | null>(null);
  const betAmount = 50;

  const play = (guess: "higher" | "lower") => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const next = Math.floor(Math.random() * 13) + 1;
      setNextCard(next);

      const isHigher = next > currentCard;
      const isLower = next < currentCard;
      const correct = (guess === "higher" && isHigher) || (guess === "lower" && isLower);

      if (next === currentCard) {
        setCredits(prev => prev + betAmount);
        toast.error("Same card! Bet returned!");
      } else if (correct) {
        const winAmount = betAmount * 2;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 Correct! Won ${winAmount} credits!`);
      } else {
        toast.error("Wrong guess!");
      }
      
      setCurrentCard(next);
      setPlaying(false);
      setTimeout(() => setNextCard(null), 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">High Low 🐂</h1>
          <p className="text-muted-foreground">Will the next card be higher or lower?</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="flex gap-8 justify-center mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Current Card</p>
            <div className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-6xl font-bold text-primary">{currentCard}</p>
            </div>
          </div>
          {nextCard !== null && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Next Card</p>
              <div className="bg-primary/20 p-8 rounded-lg border-2 border-primary">
                <p className="text-6xl font-bold text-primary">{nextCard}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => play("higher")} disabled={playing} size="lg">
            Higher
          </Button>
          <Button onClick={() => play("lower")} disabled={playing} size="lg">
            Lower
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HighLow;