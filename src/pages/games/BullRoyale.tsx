import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullRoyale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 25) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 25);
    
    setTimeout(() => {
      const placement = Math.floor(Math.random() * 10) + 1;
      let diamonds = 0;
      let title = "";
      
      if (placement === 1) {
        diamonds = 100;
        title = "🥇 VICTORY ROYALE!";
      } else if (placement <= 3) {
        diamonds = 50;
        title = `🥈 Top 3 Finish!`;
      } else if (placement <= 5) {
        diamonds = 25;
        title = `🥉 Top 5 Finish`;
      } else {
        diamonds = 10;
        title = `Placed #${placement}`;
      }
      
      toast({ 
        title,
        description: `Earned ${diamonds} diamonds!` 
      });
      setPlaying(false);
    }, 2000);
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
            <Shield className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Royale 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Battle royale for the win!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 25}
            >
              {playing ? "Battling..." : "Enter Battle (25 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullRoyale;
