import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullPower = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [powerLevel, setPowerLevel] = useState(100);

  const playGame = () => {
    if (credits < 15) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 15);
    
    setTimeout(() => {
      const newPower = Math.floor(Math.random() * 100) + 50;
      setPowerLevel(newPower);
      
      if (newPower > 120) {
        const diamonds = Math.floor(newPower / 4);
        toast({ 
          title: `⚡ Power Level ${newPower}!`, 
          description: `Incredible power! ${diamonds} diamonds!` 
        });
      } else {
        toast({ 
          title: `Power Level ${newPower}`, 
          description: "Need more power for diamonds!" 
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
            <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Power 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Unleash maximum power!</p>
            
            <div className="mb-8">
              <p className="text-2xl font-bold text-yellow-400 mb-2">Power: {powerLevel}</p>
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 15}
            >
              {playing ? "Charging..." : "Power Up (15 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullPower;
