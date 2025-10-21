import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const RocketRush = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [altitude, setAltitude] = useState(0);
  const [maxAltitude, setMaxAltitude] = useState(0);
  const betAmount = 50;

  const launch = () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setAltitude(0);
      setMaxAltitude(Math.floor(Math.random() * 15) + 5);
    }

    if (altitude >= maxAltitude) {
      toast.error("🚀 Rocket exploded!");
      setPlaying(false);
      return;
    }

    const newAlt = altitude + 1;
    setAltitude(newAlt);
    toast.success(`Altitude: ${newAlt}`);
  };

  const eject = () => {
    if (playing && altitude > 0) {
      const winAmount = betAmount * (1 + altitude * 0.5);
      setCredits(prev => prev + Math.floor(winAmount));
      toast.success(`🐂 Safe landing! Won ${Math.floor(winAmount)} credits!`);
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Rocket Rush 🐂</h1>
          <p className="text-muted-foreground">Launch and eject before explosion!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
            <p className="text-8xl mb-4">🚀</p>
            <p className="text-5xl font-bold text-primary">{altitude}</p>
            <p className="text-sm text-muted-foreground mt-2">Altitude</p>
          </div>
          {playing && altitude > 0 && (
            <p className="text-2xl mt-4 font-bold text-primary">
              Win: {Math.floor(betAmount * (1 + altitude * 0.5))} credits
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={launch} disabled={playing && altitude >= maxAltitude} size="lg">
            {playing ? "Launch Higher" : `Start (${betAmount})`}
          </Button>
          <Button onClick={eject} disabled={!playing || altitude === 0} variant="outline" size="lg">
            Eject
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RocketRush;
