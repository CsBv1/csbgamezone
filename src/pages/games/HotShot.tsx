import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const HotShot = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [temperature, setTemperature] = useState(0);
  const [maxTemp, setMaxTemp] = useState(0);
  const betAmount = 50;

  const start = () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setTemperature(0);
      setMaxTemp(Math.floor(Math.random() * 8) + 5);
    }

    if (temperature >= maxTemp) {
      toast.error("🔥 Overheated!");
      setPlaying(false);
      return;
    }

    const newTemp = temperature + 1;
    setTemperature(newTemp);
    toast.success(`Temperature: ${newTemp}`);
  };

  const coolDown = () => {
    if (playing && temperature > 0) {
      const winAmount = betAmount * (1 + temperature * 0.8);
      setCredits(prev => prev + Math.floor(winAmount));
      toast.success(`🐂 Cooled down! Won ${Math.floor(winAmount)} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Hot Shot 🐂</h1>
          <p className="text-muted-foreground">Heat it up, cool down in time!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="text-center mb-6">
          <div className="inline-block bg-primary/20 p-12 rounded-lg border-4 border-primary">
            <p className="text-8xl mb-4">🔥</p>
            <p className="text-5xl font-bold text-primary">{temperature}°</p>
            <p className="text-sm text-muted-foreground mt-2">Temperature</p>
          </div>
          {playing && temperature > 0 && (
            <p className="text-2xl mt-4 font-bold text-primary">
              Win: {Math.floor(betAmount * (1 + temperature * 0.8))} credits
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={start} disabled={playing && temperature >= maxTemp} size="lg">
            {playing ? "Heat Up" : `Start (${betAmount})`}
          </Button>
          <Button onClick={coolDown} disabled={!playing || temperature === 0} variant="outline" size="lg">
            Cool Down
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HotShot;