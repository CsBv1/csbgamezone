import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const MysticOrbs = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [orbs, setOrbs] = useState<string[]>([]);
  const betAmount = 50;

  const orbColors = ["🔴", "🔵", "🟢", "🟡", "🟣"];
  const orbValues = { "🔴": 50, "🔵": 75, "🟢": 100, "🟡": 150, "🟣": 200 };

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    const newOrbs = Array(5).fill(0).map(() => 
      orbColors[Math.floor(Math.random() * orbColors.length)]
    );
    setOrbs(newOrbs);

    setTimeout(() => {
      const uniqueOrbs = [...new Set(newOrbs)];
      let totalWin = 0;

      if (uniqueOrbs.length === 1) {
        totalWin = 500;
        toast.success(`🐂 ALL MATCHING! Won ${totalWin} credits!`);
      } else if (uniqueOrbs.length === 5) {
        totalWin = 300;
        toast.success(`🐂 RAINBOW! Won ${totalWin} credits!`);
      } else {
        newOrbs.forEach(orb => {
          totalWin += orbValues[orb as keyof typeof orbValues];
        });
        toast.success(`Won ${totalWin} credits!`);
      }

      setCredits(prev => prev + totalWin);
      setPlaying(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Mystic Orbs 🐂</h1>
          <p className="text-muted-foreground">Match orbs for mystical wins!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {orbs.length > 0 && (
          <div className="flex gap-4 justify-center mb-6">
            {orbs.map((orb, i) => (
              <div key={i} className="bg-primary/20 p-8 rounded-full border-4 border-primary">
                <p className="text-6xl">{orb}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>🔴 50 | 🔵 75 | 🟢 100 | 🟡 150 | 🟣 200</p>
          <p className="mt-2 font-bold">All matching: 500x | Rainbow: 300x</p>
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Revealing..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default MysticOrbs;
