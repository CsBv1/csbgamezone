import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gem, Bomb } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

const Mines = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [grid, setGrid] = useState<(boolean | null)[]>(Array(25).fill(null));
  const [mines, setMines] = useState<number[]>([]);
  const [credits, setCredits] = useState(1000);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const numMines = 5;

  const startGame = () => {
    if (credits < 50) {
      toast.error("Not enough credits!");
      audioManager.playSFX('error');
      return;
    }
    setCredits(credits - 50);
    audioManager.playSFX('buttonPress');
    
    const minePositions: number[] = [];
    while (minePositions.length < numMines) {
      const pos = Math.floor(Math.random() * 25);
      if (!minePositions.includes(pos)) {
        minePositions.push(pos);
      }
    }
    
    setMines(minePositions);
    setGrid(Array(25).fill(null));
    setRevealed(0);
    setPlaying(true);
    setGameOver(false);
  };

  const revealTile = (index: number) => {
    if (!playing || gameOver || grid[index] !== null) return;

    const isMine = mines.includes(index);
    const newGrid = [...grid];
    newGrid[index] = !isMine;
    setGrid(newGrid);

    if (isMine) {
      setGameOver(true);
      setPlaying(false);
      mines.forEach(m => {
        newGrid[m] = false;
      });
      setGrid(newGrid);
      audioManager.playSFX('lose');
      toast.error("💣 Hit a mine! Game over!");
    } else {
      const newRevealed = revealed + 1;
      setRevealed(newRevealed);
      const multiplier = 1 + (newRevealed * 0.5);
      audioManager.playSFX('collect');
      toast.success(`🐂 Safe! ${multiplier.toFixed(1)}x multiplier`);
    }
  };

  const cashOut = () => {
    const multiplier = 1 + (revealed * 0.5);
    const winAmount = Math.floor(50 * multiplier);
    setCredits(c => c + winAmount);
    audioManager.playSFX('win');
    toast.success(`Cashed out ${winAmount} credits! 🐂`);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bull-pattern">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
            {getBackLabel()}
          </Button>
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mt-2">
            Mines 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-12 h-12 rounded-full border-4 border-primary shadow-lg" />
          </div>

          {playing && (
            <div className="text-center mb-4">
              <p className="text-xl font-bold">
                Revealed: {revealed}/20 | Multiplier: {(1 + revealed * 0.5).toFixed(1)}x
              </p>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2 mb-6">
            {grid.map((tile, i) => (
              <button
                key={i}
                onClick={() => revealTile(i)}
                disabled={!playing || gameOver || tile !== null}
                className={`aspect-square rounded-lg font-bold text-2xl transition-all ${
                  tile === null
                    ? 'bg-muted hover:bg-muted/80 active:scale-95'
                    : tile
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                    : 'bg-gradient-to-br from-red-500 to-rose-500'
                }`}
              >
                {tile === true ? <Gem className="w-full h-full p-2 text-white" /> : 
                 tile === false ? <Bomb className="w-full h-full p-2 text-white" /> : 
                 '?'}
              </button>
            ))}
          </div>

          {!playing && !gameOver && (
            <Button variant="gold" size="xl" className="w-full" onClick={startGame}>
              Start Game (50 credits)
            </Button>
          )}

          {playing && revealed > 0 && (
            <Button variant="gold" size="lg" className="w-full" onClick={cashOut}>
              Cash Out ({Math.floor(50 * (1 + revealed * 0.5))} credits)
            </Button>
          )}

          {gameOver && (
            <Button variant="gold" size="xl" className="w-full" onClick={startGame}>
              Try Again (50 credits)
            </Button>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">Rules:</h3>
            <p className="text-sm text-muted-foreground">
              {numMines} mines hidden. Find gems to increase multiplier. Cash out before hitting a mine! 🐂
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Mines;
