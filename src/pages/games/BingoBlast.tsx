import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const BingoBlast = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [card, setCard] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [marked, setMarked] = useState<number[]>([]);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newCard = Array.from({ length: 25 }, () => Math.floor(Math.random() * 75) + 1);
    setCard(newCard);
    setDrawn([]);
    setMarked([]);

    drawNumber(newCard, []);
  };

  const drawNumber = (currentCard: number[], currentDrawn: number[]) => {
    if (currentDrawn.length >= 20) {
      checkWin(currentCard, currentDrawn);
      return;
    }

    setTimeout(() => {
      const num = Math.floor(Math.random() * 75) + 1;
      if (!currentDrawn.includes(num)) {
        const newDrawn = [...currentDrawn, num];
        setDrawn(newDrawn);
        
        if (currentCard.includes(num)) {
          setMarked(prev => [...prev, num]);
        }
        
        drawNumber(currentCard, newDrawn);
      } else {
        drawNumber(currentCard, currentDrawn);
      }
    }, 300);
  };

  const checkWin = (currentCard: number[], currentDrawn: number[]) => {
    const markedCount = currentCard.filter(n => currentDrawn.includes(n)).length;
    
    if (markedCount >= 5) {
      const winAmount = betAmount * (1 + markedCount * 0.5);
      setCredits(prev => prev + Math.floor(winAmount));
      toast.success(`🐂 ${markedCount} matches! Won ${Math.floor(winAmount)} credits!`);
    } else {
      toast.error(`Only ${markedCount} matches!`);
    }
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Bingo Blast 🐂</h1>
          <p className="text-muted-foreground">Match the drawn numbers!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {card.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mb-6">
            {card.map((num, i) => (
              <div
                key={i}
                className={`p-3 rounded border-2 text-center font-bold ${
                  marked.includes(num)
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        )}

        {drawn.length > 0 && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">Last Drawn:</p>
            <div className="inline-block bg-primary/20 p-4 rounded-lg border-2 border-primary">
              <p className="text-4xl font-bold text-primary">{drawn[drawn.length - 1]}</p>
            </div>
          </div>
        )}

        <Button onClick={startGame} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default BingoBlast;
