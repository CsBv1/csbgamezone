import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullFrenzy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 18) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 18);
    
    setTimeout(() => {
      const frenzyLevel = Math.floor(Math.random() * 5) + 1;
      const diamonds = frenzyLevel * 8;
      toast({ 
        title: `🔥 Frenzy Level ${frenzyLevel}!`, 
        description: `Maximum chaos! Won ${diamonds} diamonds!` 
      });
      setPlaying(false);
    }, 1400);
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
            <Flame className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Frenzy 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Unleash the frenzy!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 18}
            >
              {playing ? "Frenzying..." : "Unleash (18 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullFrenzy;
