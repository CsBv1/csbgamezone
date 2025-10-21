import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullChallenge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState(1);

  const playGame = () => {
    if (credits < 10) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 10);
    
    setTimeout(() => {
      const success = Math.random() > 0.3;
      if (success) {
        const diamonds = level * 5;
        setLevel(level + 1);
        toast({ 
          title: `🏆 Level ${level} Complete!`, 
          description: `Earned ${diamonds} diamonds! Now level ${level + 1}` 
        });
      } else {
        setLevel(1);
        toast({ 
          title: "Challenge Failed!", 
          description: "Starting over at level 1",
          variant: "destructive" 
        });
      }
      setPlaying(false);
    }, 1000);
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
            <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Challenge 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Complete levels to earn more diamonds!</p>
            
            <div className="mb-8">
              <p className="text-2xl font-bold text-primary mb-2">Level: {level}</p>
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 10}
            >
              {playing ? "Challenging..." : "Play (10 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullChallenge;
