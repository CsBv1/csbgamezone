import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const PirateBooty = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [chests, setChests] = useState<string[]>(new Array(9).fill(""));
  const [chestsOpened, setChestsOpened] = useState(0);
  const betAmount = 50;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setChests(new Array(9).fill(""));
    setChestsOpened(0);
  };

  const openChest = (index: number) => {
    if (!playing || chests[index]) return;

    const outcomes = ["💎", "💰", "⚔️"];
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    const newChests = [...chests];
    newChests[index] = pick;
    setChests(newChests);
    setChestsOpened(chestsOpened + 1);

    if (pick === "⚔️") {
      toast.error("Hit a sword! Game over!");
      setPlaying(false);
    } else {
      const winValue = pick === "💎" ? 80 : 40;
      setCredits(prev => prev + winValue);
      
      if (chestsOpened + 1 === 8) {
        const bonus = 200;
        setCredits(prev => prev + bonus);
        toast.success(`🐂 All safe chests! Bonus ${bonus} credits!`);
        setPlaying(false);
      } else {
        toast.success(`Found ${pick}! +${winValue} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Pirate Booty 🐂</h1>
          <p className="text-muted-foreground">Open chests, avoid swords!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-4">
            <p className="text-lg font-bold text-primary">Chests Opened: {chestsOpened}/8</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array(9).fill(0).map((_, i) => (
            <Button
              key={i}
              onClick={() => openChest(i)}
              disabled={!playing || chests[i] !== ""}
              variant={chests[i] ? "default" : "outline"}
              className="h-24 text-5xl"
            >
              {chests[i] || "📦"}
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

export default PirateBooty;
