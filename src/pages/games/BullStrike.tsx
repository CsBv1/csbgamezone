import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullStrike = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 12) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 12);
    
    setTimeout(() => {
      const accuracy = Math.random() * 100;
      if (accuracy > 80) {
        const diamonds = Math.floor(accuracy / 2);
        toast({ 
          title: `🎯 Perfect Strike!`, 
          description: `${accuracy.toFixed(0)}% accuracy! ${diamonds} diamonds!` 
        });
      } else if (accuracy > 50) {
        const smallWin = Math.floor(accuracy / 5);
        toast({ 
          title: "Good Strike", 
          description: `${accuracy.toFixed(0)}% accuracy. ${smallWin} diamonds` 
        });
      } else {
        toast({ title: "Missed!", description: `Only ${accuracy.toFixed(0)}% accuracy` });
      }
      setPlaying(false);
    }, 1100);
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
            <Target className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Strike 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Hit the perfect strike!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 12}
            >
              {playing ? "Striking..." : "Strike (12 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullStrike;
