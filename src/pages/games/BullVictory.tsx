import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullVictory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [streak, setStreak] = useState(0);

  const playGame = () => {
    if (credits < 10) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 10);
    
    setTimeout(() => {
      const victory = Math.random() > 0.35;
      if (victory) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        const diamonds = newStreak * 6;
        toast({ 
          title: `🏆 Victory #${newStreak}!`, 
          description: `Win streak! Earned ${diamonds} diamonds!` 
        });
      } else {
        setStreak(0);
        toast({ 
          title: "Defeat!", 
          description: "Streak broken. Start again!",
          variant: "destructive" 
        });
      }
      setPlaying(false);
    }, 1200);
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
            <Award className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Victory 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Build your victory streak!</p>
            
            <div className="mb-8">
              <p className="text-2xl font-bold text-primary mb-2">Streak: {streak}</p>
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 10}
            >
              {playing ? "Fighting..." : "Seek Victory (10 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullVictory;
