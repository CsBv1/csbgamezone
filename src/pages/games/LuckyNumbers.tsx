import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const LuckyNumbers = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const betAmount = 50;

  const toggleNumber = (num: number) => {
    if (playing) return;
    
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 6) {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    if (selectedNumbers.length !== 6) {
      toast.error("Pick 6 numbers!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const drawn: number[] = [];
    while (drawn.length < 6) {
      const num = Math.floor(Math.random() * 36) + 1;
      if (!drawn.includes(num)) drawn.push(num);
    }
    setDrawnNumbers(drawn);

    setTimeout(() => {
      const matches = selectedNumbers.filter(n => drawn.includes(n)).length;
      let winAmount = 0;

      if (matches === 6) winAmount = betAmount * 100;
      else if (matches === 5) winAmount = betAmount * 20;
      else if (matches === 4) winAmount = betAmount * 5;
      else if (matches === 3) winAmount = betAmount * 2;

      if (winAmount > 0) {
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${matches} matches! Won ${winAmount} credits!`);
      } else {
        toast.error(`Only ${matches} matches!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Lucky Numbers 🐂</h1>
          <p className="text-muted-foreground">Pick 6 numbers to win!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {drawnNumbers.length > 0 && (
          <div className="mb-6">
            <p className="text-center text-sm text-muted-foreground mb-2">Drawn Numbers</p>
            <div className="flex gap-2 justify-center">
              {drawnNumbers.map((num, i) => (
                <div key={i} className="bg-primary/20 p-4 rounded-full border-2 border-primary w-14 h-14 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{num}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center mb-4">
          Selected: {selectedNumbers.length}/6
        </p>

        <div className="grid grid-cols-6 gap-2 mb-6">
          {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
            <Button
              key={num}
              onClick={() => toggleNumber(num)}
              variant={selectedNumbers.includes(num) ? "default" : "outline"}
              disabled={playing}
              className="h-12"
            >
              {num}
            </Button>
          ))}
        </div>

        <Button onClick={play} disabled={playing || selectedNumbers.length !== 6} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default LuckyNumbers;
