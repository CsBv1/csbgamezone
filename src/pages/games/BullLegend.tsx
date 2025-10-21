import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullLegend = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 30) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 30);
    
    setTimeout(() => {
      const legendary = Math.random() > 0.5;
      if (legendary) {
        const diamonds = Math.floor(Math.random() * 60) + 40;
        toast({ 
          title: "👑 LEGENDARY!", 
          description: `You are a legend! Won ${diamonds} diamonds!` 
        });
      } else {
        const consolation = 20;
        toast({ 
          title: "Nearly Legendary", 
          description: `Keep trying! Consolation: ${consolation} diamonds` 
        });
      }
      setPlaying(false);
    }, 1800);
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
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Legend 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Become a legend!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 30}
            >
              {playing ? "Ascending..." : "Seek Legend (30 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullLegend;
