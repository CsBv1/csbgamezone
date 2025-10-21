import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Castle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullEmpire = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);
  const [empireSize, setEmpireSize] = useState(1);

  const playGame = () => {
    if (credits < 25) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 25);
    
    setTimeout(() => {
      const expand = Math.random() > 0.3;
      if (expand) {
        const newSize = empireSize + 1;
        setEmpireSize(newSize);
        const diamonds = newSize * 12;
        toast({ 
          title: `🏰 Empire Grows!`, 
          description: `Size ${newSize} empire! ${diamonds} diamonds!` 
        });
      } else {
        toast({ 
          title: "Empire Stable", 
          description: `Size ${empireSize} maintained` 
        });
      }
      setPlaying(false);
    }, 1600);
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
            <Castle className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Empire 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Build your mighty empire!</p>
            
            <div className="mb-8">
              <p className="text-2xl font-bold text-primary mb-2">Empire Size: {empireSize}</p>
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 25}
            >
              {playing ? "Expanding..." : "Build Empire (25 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullEmpire;
