import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const MagicMatch = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [cards, setCards] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const betAmount = 50;

  const symbols = ["🌟", "🔮", "🎭", "🎪", "🎨", "🎯"];

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    
    const gameCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5);
    setCards(gameCards);
    setRevealed([]);
    setMatched([]);
    setFirstPick(null);
  };

  const flipCard = (index: number) => {
    if (!playing || revealed.includes(index) || matched.includes(index)) return;

    if (firstPick === null) {
      setFirstPick(index);
      setRevealed([index]);
    } else {
      setRevealed([firstPick, index]);

      if (cards[firstPick] === cards[index]) {
        const newMatched = [...matched, firstPick, index];
        setMatched(newMatched);
        setFirstPick(null);
        setRevealed([]);

        if (newMatched.length === 12) {
          const winAmount = betAmount * 5;
          setCredits(prev => prev + winAmount);
          toast.success(`🐂 All matched! Won ${winAmount} credits!`);
          setPlaying(false);
        } else {
          toast.success("Match!");
        }
      } else {
        setTimeout(() => {
          setRevealed([]);
          setFirstPick(null);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Magic Match 🐂</h1>
          <p className="text-muted-foreground">Match all pairs to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {cards.map((card, i) => (
            <Button
              key={i}
              onClick={() => flipCard(i)}
              variant={matched.includes(i) || revealed.includes(i) ? "default" : "outline"}
              disabled={!playing || matched.includes(i)}
              className="h-20 text-4xl"
            >
              {matched.includes(i) || revealed.includes(i) ? card : "🎴"}
            </Button>
          ))}
        </div>

        {!playing && (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        )}
      </Card>
    </div>
  );
};

export default MagicMatch;
