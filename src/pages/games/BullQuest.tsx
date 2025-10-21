import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BullQuest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState(500);
  const [playing, setPlaying] = useState(false);

  const playGame = () => {
    if (credits < 12) {
      toast({ title: "Not enough credits!", variant: "destructive" });
      return;
    }
    
    setPlaying(true);
    setCredits(credits - 12);
    
    setTimeout(() => {
      const success = Math.random() > 0.4;
      if (success) {
        const diamonds = Math.floor(Math.random() * 18) + 8;
        toast({ 
          title: "🗺️ Quest Complete!", 
          description: `Journey successful! Found ${diamonds} diamonds!` 
        });
      } else {
        toast({ title: "Quest Failed", description: "The path was too dangerous!" });
      }
      setPlaying(false);
    }, 1300);
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
            <Map className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Quest 🐂
            </h1>
            <p className="text-muted-foreground mb-6">Embark on an epic quest!</p>
            
            <div className="mb-8">
              <p className="text-3xl font-bold text-foreground">Credits: {credits}</p>
            </div>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={playGame}
              disabled={playing || credits < 12}
            >
              {playing ? "Questing..." : "Start Quest (12 Credits)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BullQuest;
