import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const LuckyLinks = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [chain, setChain] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const betAmount = 50;

  const symbols = ["🔗", "💫", "⚡", "💎", "🌟", "💥"];

  const play = () => {
    if (!playing) {
      if (credits < betAmount) {
        toast.error("Not enough credits!");
        return;
      }
      setCredits(prev => prev - betAmount);
      setPlaying(true);
      setChain([]);
      setMultiplier(1);
    }

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const newChain = [...chain, symbol];
    setChain(newChain);

    if (newChain.length > 1 && newChain[newChain.length - 1] === newChain[newChain.length - 2]) {
      const newMult = multiplier + 1;
      setMultiplier(newMult);
      toast.success(`Chain! ${newMult}x multiplier`);
    } else if (newChain.length > 1) {
      const winAmount = Math.floor(betAmount * multiplier);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Chain ended! Won ${winAmount} credits!`);
      setPlaying(false);
    }
  };

  const cashOut = () => {
    if (playing && chain.length > 0) {
      const winAmount = Math.floor(betAmount * multiplier);
      setCredits(prev => prev + winAmount);
      toast.success(`🐂 Cashed out ${winAmount} credits!`);
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
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Lucky Links 🐂</h1>
          <p className="text-muted-foreground">Build a chain of matching symbols!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-primary mb-2">{multiplier}x Multiplier</p>
            <p className="text-lg text-muted-foreground">Win: {Math.floor(betAmount * multiplier)} credits</p>
          </div>
        )}

        {chain.length > 0 && (
          <div className="flex gap-2 justify-center mb-6 flex-wrap">
            {chain.map((symbol, i) => (
              <div key={i} className="bg-primary/20 p-4 rounded-lg border-2 border-primary">
                <p className="text-4xl">{symbol}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={play} disabled={chain.length >= 10} size="lg">
            {playing ? "Link" : `Start (${betAmount})`}
          </Button>
          <Button onClick={cashOut} disabled={!playing || chain.length === 0} variant="outline" size="lg">
            Cash Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LuckyLinks;
