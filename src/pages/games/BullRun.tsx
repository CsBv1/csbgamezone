import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const BullRun = () => {
  const navigate = useNavigate();
  const [racing, setRacing] = useState(false);
  const [positions, setPositions] = useState([0, 0, 0, 0]);
  const [selectedBull, setSelectedBull] = useState<number | null>(null);
  const [credits, setCredits] = useState(100);
  const [winner, setWinner] = useState<number | null>(null);

  const bulls = ["🐂", "🐃", "🦬", "🐄"];
  const colors = ["text-red-500", "text-blue-500", "text-green-500", "text-yellow-500"];

  const startRace = () => {
    if (selectedBull === null) {
      toast.error("Select a bull first!");
      return;
    }

    if (credits < 20) {
      toast.error("Not enough credits!");
      return;
    }

    setCredits((c) => c - 20);
    setRacing(true);
    setWinner(null);
    setPositions([0, 0, 0, 0]);

    const interval = setInterval(() => {
      setPositions((prev) => {
        const newPositions = prev.map((pos) => pos + Math.random() * 10);
        
        const maxPos = Math.max(...newPositions);
        if (maxPos >= 100) {
          clearInterval(interval);
          setRacing(false);
          const winnerIndex = newPositions.indexOf(maxPos);
          setWinner(winnerIndex);

          if (winnerIndex === selectedBull) {
            const winAmount = 80;
            setCredits((c) => c + winAmount);
            toast.success(`🎉 Your bull won! +${winAmount} credits!`);
          } else {
            toast.error("Your bull didn't win this time!");
          }
        }

        return newPositions.map((pos) => Math.min(pos, 100));
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bull-pattern flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/games")}>
            <ArrowLeft className="w-5 h-5" />
            Back to Games
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="max-w-4xl w-full p-8 bg-card border-2 border-primary/30 glow-gold">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              Bull Run
            </h1>
            <div className="mt-4">
              <p className="text-muted-foreground">Credits</p>
              <p className="text-3xl font-bold text-primary">{credits}</p>
            </div>
          </div>

          {/* Bull Selection */}
          <div className="mb-8">
            <p className="text-center text-muted-foreground mb-4">Select your bull</p>
            <div className="flex justify-center gap-4">
              {bulls.map((bull, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedBull(index)}
                  disabled={racing}
                  className={`text-6xl p-4 rounded-lg transition-all ${
                    selectedBull === index
                      ? "bg-primary scale-125"
                      : "bg-secondary hover:bg-secondary/80"
                  } ${racing ? "opacity-50" : ""}`}
                >
                  {bull}
                </button>
              ))}
            </div>
          </div>

          {/* Race Track */}
          <div className="bg-secondary rounded-lg p-6 mb-6">
            {bulls.map((bull, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <div className="relative h-16 bg-background rounded-lg overflow-hidden border-2 border-border">
                  <div
                    className={`absolute left-0 top-0 h-full bg-primary/20 transition-all duration-100`}
                    style={{ width: `${positions[index]}%` }}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-100 ${
                      winner === index ? "animate-bounce" : ""
                    }`}
                    style={{ left: `${positions[index]}%` }}
                  >
                    {bull}
                  </div>
                  {positions[index] >= 100 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">
                      🏁
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="gold"
            size="lg"
            onClick={startRace}
            disabled={racing || selectedBull === null || credits < 20}
            className="w-full"
          >
            {racing ? "Racing..." : "Start Race (20 Credits)"}
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default BullRun;
