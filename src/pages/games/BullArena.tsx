import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

const BullArena = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 15) {
      audioManager.playSFX('error');
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    audioManager.playSFX('attack');
    setPlaying(true);
    setCredits(credits - 15);
    
    setTimeout(() => {
      const outcome = Math.random();
      if (outcome > 0.6) {
        const diamonds = Math.floor(Math.random() * 25) + 15;
        audioManager.playSFX('jackpot');
        toast({ 
          title: "⚔️ Victory!", 
          description: `You dominated the arena! ${diamonds} diamonds!` 
        });
      } else {
        audioManager.playSFX('lose');
        toast({ title: "Defeated!", description: "Train harder and return!", variant: "destructive" });
      }
      setPlaying(false);
    }, 1500);
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
            <Swords className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Arena 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Battle in the arena for glory!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 15}
            >
              {playing ? "Battling..." : "Enter Arena (15 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullArena;
