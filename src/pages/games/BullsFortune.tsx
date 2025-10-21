import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullsFortune = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 15) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 15);
    
    setTimeout(() => {
      const win = Math.random() > 0.4;
      if (win) {
        const diamonds = Math.floor(Math.random() * 20) + 10;
        toast({ 
          title: "💎 Fortune Found!", 
          description: `You won ${diamonds} diamonds!` 
        });
      } else {
        toast({ title: "No luck this time", variant: "destructive" });
      }
      setPlaying(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="mt-6 p-8 bg-card/95 backdrop-blur-sm">
          <div className="text-center">
            <Gem className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bulls Fortune 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Discover your fortune with the bulls!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 15}
            >
              {playing ? "Seeking Fortune..." : "Play (15 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullsFortune;
