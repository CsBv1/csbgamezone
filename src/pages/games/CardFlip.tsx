import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CARDS = ["🐂", "💰", "🏆", "💎", "⭐", "🔥"];

const CardFlip = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [credits, setCredits] = useState(100);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const shuffled = [...CARDS, ...CARDS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched([...matched, ...newFlipped]);
        setFlipped([]);
        setCredits((c) => c + 10);
        toast.success("Match! +10 credits");

        if (matched.length + 2 === cards.length) {
          setTimeout(() => {
            const bonus = Math.max(50 - moves * 2, 10);
            setCredits((c) => c + bonus);
            toast.success(`🎉 Game complete! Bonus: ${bonus} credits`);
          }, 500);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bull-pattern flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-5 h-5" />
            Back to Games
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-8 bg-card border-2 border-primary/30 glow-gold">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Card Flip
            </h1>
            <div className="flex justify-center gap-8 mt-4">
              <div>
                <p className="text-muted-foreground">Credits</p>
                <p className="text-3xl font-bold text-primary">{credits}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Moves</p>
                <p className="text-3xl font-bold text-primary">{moves}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {cards.map((card, index) => {
              const isFlipped = flipped.includes(index) || matched.includes(index);
              return (
                <button
                  key={index}
                  onClick={() => handleCardClick(index)}
                  className={`aspect-square rounded-lg text-4xl font-bold transition-all transform ${
                    isFlipped
                      ? "bg-primary text-primary-foreground scale-105"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {isFlipped ? card : "?"}
                </button>
              );
            })}
          </div>

          <Button variant="gold" size="lg" onClick={initGame} className="w-full">
            New Game
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default CardFlip;
