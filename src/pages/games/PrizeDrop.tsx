import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const PrizeDrop = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const betAmount = 50;

  const prizes = [0, 25, 50, 100, 200, 500];

  const play = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits(prev => prev - betAmount);
    setPlaying(true);

    setTimeout(() => {
      const won = prizes[Math.floor(Math.random() * prizes.length)];
      setPrize(won);

      if (won > 0) {
        setCredits(prev => prev + won);
        toast.success(`🐂 Won ${won} credits!`);
      } else {
        toast.error("No prize this time!");
      }
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Prize Drop 🐂</h1>
          <p className="text-muted-foreground">Catch the falling prizes!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {prize !== null && (
          <div className="text-center mb-6">
            <div className="inline-block bg-primary/20 p-8 rounded-lg border-2 border-primary">
              <p className="text-6xl font-bold text-primary">{prize}</p>
              <p className="text-sm text-muted-foreground mt-2">Credits Won</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-6 text-center text-sm text-muted-foreground">
          {prizes.map(p => (
            <div key={p} className="border border-border rounded p-2">
              {p === 0 ? "Nothing" : `${p} credits`}
            </div>
          ))}
        </div>

        <Button onClick={play} disabled={playing} size="lg" className="w-full">
          {playing ? "Dropping..." : `Play (${betAmount} credits)`}
        </Button>
      </Card>
    </div>
  );
};

export default PrizeDrop;
