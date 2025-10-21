import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";

const GemGrab = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [tiles, setTiles] = useState<{type: string; revealed: boolean}[]>([]);
  const [collected, setCollected] = useState(0);
  const betAmount = 50;

  const gems = ["💎", "🔷", "💠", "🔶"];
  const bombs = 3;

  const startGame = () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    setCredits(prev => prev - betAmount);
    setPlaying(true);
    setCollected(0);

    const newTiles = Array(16).fill(0).map(() => ({
      type: gems[Math.floor(Math.random() * gems.length)],
      revealed: false
    }));

    for (let i = 0; i < bombs; i++) {
      let pos = Math.floor(Math.random() * 16);
      while (newTiles[pos].type === "💣") {
        pos = Math.floor(Math.random() * 16);
      }
      newTiles[pos] = { type: "💣", revealed: false };
    }

    setTiles(newTiles);
  };

  const revealTile = (index: number) => {
    if (!playing || tiles[index].revealed) return;

    const newTiles = [...tiles];
    newTiles[index].revealed = true;
    setTiles(newTiles);

    if (tiles[index].type === "💣") {
      toast.error("💣 Hit a bomb! Game over!");
      newTiles.forEach((tile, i) => {
        if (tile.type === "💣") newTiles[i].revealed = true;
      });
      setTiles(newTiles);
      setPlaying(false);
    } else {
      const newCollected = collected + 1;
      setCollected(newCollected);
      const winAmount = betAmount + (newCollected * 10);
      toast.success(`Found a gem! Total: ${winAmount} credits`);
    }
  };

  const cashOut = () => {
    const winAmount = betAmount + (collected * 10);
    setCredits(prev => prev + winAmount);
    toast.success(`🐂 Cashed out ${winAmount} credits!`);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Gem Grab 🐂</h1>
          <p className="text-muted-foreground">Collect gems, avoid bombs!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        {playing && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-primary">Collected: {collected}</p>
            <p className="text-lg text-muted-foreground">Win: {betAmount + (collected * 10)} credits</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          {tiles.map((tile, i) => (
            <Button
              key={i}
              onClick={() => revealTile(i)}
              disabled={!playing || tile.revealed}
              variant={tile.revealed ? (tile.type === "💣" ? "destructive" : "default") : "outline"}
              className="h-20 text-4xl"
            >
              {tile.revealed ? tile.type : "❓"}
            </Button>
          ))}
        </div>

        {!playing ? (
          <Button onClick={startGame} size="lg" className="w-full">
            Play ({betAmount} credits)
          </Button>
        ) : (
          <Button onClick={cashOut} disabled={collected === 0} variant="outline" size="lg" className="w-full">
            Cash Out
          </Button>
        )}
      </Card>
    </div>
  );
};

export default GemGrab;
