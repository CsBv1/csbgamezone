import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullJackpot = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [jackpot, setJackpot] = useState(500);

  const playGame = () => {
    if (credits < 25) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 25);
    setJackpot(jackpot + 10);
    
    setTimeout(() => {
      const chance = Math.random();
      if (chance > 0.95) {
        toast({ 
          title: "🎰 JACKPOT!", 
          description: `You won ${jackpot} diamonds!`,
        });
        setJackpot(100);
      } else if (chance > 0.7) {
        const smallWin = Math.floor(Math.random() * 30) + 10;
        toast({ 
          title: "Small Win!", 
          description: `Won ${smallWin} diamonds!` 
        });
      } else {
        toast({ title: "Keep trying!", description: `Jackpot grows to ${jackpot + 10}!` });
      }
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Button>

        <Card className="mt-6 p-8 bg-card/95 backdrop-blur-sm">
          <div className="text-center">
            <CircleDollarSign className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Jackpot 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Win the progressive jackpot!</p>
            
            <div className="mb-8">
              <p className="text-4xl font-bold text-yellow-400 mb-4">Jackpot: {jackpot} 💎</p>
              <p className="text-2xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 25}
            >
              {playing ? "Spinning..." : "Play (25 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullJackpot;
