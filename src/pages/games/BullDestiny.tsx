import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Stars } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullDestiny = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 20) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 20);
    
    setTimeout(() => {
      const destinyScore = Math.floor(Math.random() * 100);
      let diamonds = 0;
      let title = "";
      
      if (destinyScore > 90) {
        diamonds = 80;
        title = "⭐ LEGENDARY DESTINY!";
      } else if (destinyScore > 70) {
        diamonds = 40;
        title = "✨ Epic Destiny";
      } else if (destinyScore > 50) {
        diamonds = 20;
        title = "🌟 Good Destiny";
      } else {
        diamonds = 10;
        title = "Destiny Awaits";
      }
      
      toast({ 
        title,
        description: `Destiny score: ${destinyScore}. Won ${diamonds} diamonds!` 
      });
      setPlaying(false);
    }, 1400);
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
            <Stars className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Destiny 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Discover your destiny!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 20}
            >
              {playing ? "Revealing..." : "Find Destiny (20 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullDestiny;
