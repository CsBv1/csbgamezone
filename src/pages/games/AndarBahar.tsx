import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const AndarBahar = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [jokerCard, setJokerCard] = useState<string | null>(null);
  const [choice, setChoice] = useState<"andar" | "bahar">("andar");
  const betAmount = 50;

  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suits = ["♠", "♥", "♦", "♣"];
  const drawCard = () => `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const joker = drawCard();
    setJokerCard(joker);

    setTimeout(() => {
      const result = Math.random() > 0.5 ? "andar" : "bahar";
      if (result === choice) {
        const winAmount = betAmount * 2;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${result.toUpperCase()}! Won ${winAmount} credits!`);
      } else {
        toast.error(`${result.toUpperCase()} wins!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Andar Bahar 🐂</h1>
          <p className="text-muted-foreground">Pick your side!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {jokerCard && (
          <div className="mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Joker Card</p>
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-5xl font-bold text-primary">{jokerCard}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant={choice === "andar" ? "default" : "outline"}
            onClick={() => !playing && setChoice("andar")}
            size="lg"
          >
            Andar
          </Button>
          <Button
            variant={choice === "bahar" ? "default" : "outline"}
            onClick={() => !playing && setChoice("bahar")}
            size="lg"
          >
            Bahar
          </Button>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Playing..." : `Play ${choice.toUpperCase()} (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default AndarBahar;
