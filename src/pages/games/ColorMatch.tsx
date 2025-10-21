import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const ColorMatch = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [choice, setChoice] = useState("red");
  const betAmount = 50;

  const colors = ["red", "blue", "green", "yellow", "purple"];
  const colorClasses = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
  };

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const picked = colors[Math.floor(Math.random() * colors.length)];
      setResult(picked);

      if (picked === choice) {
        const winAmount = betAmount * 4;
        setCredits(prev => prev + winAmount);
        toast.success(`🐂 ${picked.toUpperCase()} match! Won ${winAmount} credits!`);
      } else {
        toast.error(`Picked ${picked.toUpperCase()}!`);
      }
      setPlaying(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Color Match 🐂</h1>
          <p className="text-muted-foreground">Pick the right color!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {result && (
          <div className="text-center mb-6">
            <div className={`inline-block ${colorClasses[result as keyof typeof colorClasses]} p-16 rounded-lg border-4 border-primary`}>
            </div>
            <p className="text-xl font-bold mt-2 capitalize">{result}</p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 mb-6">
          {colors.map(color => (
            <Button
              key={color}
              onClick={() => !playing && setChoice(color)}
              disabled={playing}
              variant={choice === color ? "default" : "outline"}
              className="h-20"
            >
              <div className={`w-12 h-12 rounded ${colorClasses[color as keyof typeof colorClasses]}`}></div>
            </Button>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Drawing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default ColorMatch;
