import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pickaxe } from "lucide-react";

export default function PayDirt() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [depth, setDepth] = useState(1);
  const [grid, setGrid] = useState<string[][]>([]);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [digsRemaining, setDigsRemaining] = useState(10);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    const fetchUserDataAndStart = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/dashboard");
        return;
      }
      setUserId(user.id);

      const { data: keysData } = await supabase.from('user_keys' as any).select('balance').eq('user_id', user.id).single();
      if (!keysData || (keysData as any).balance < 1) {
        toast.error("You need a key to enter! 🔑");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      await supabase.from('user_keys' as any).update({ balance: (keysData as any).balance - 1 }).eq('user_id', user.id);
      toast.success("Key used! Game starting...");
      generateGrid(1);
      setGameActive(true);
      setDepth(1);
      setTotalDiamonds(0);
      setDigsRemaining(10);
      setGameFinished(false);
      setAutoStarting(false);
    };
    fetchUserDataAndStart();
  }, []);

  const generateGrid = (currentDepth: number) => {
    const size = 5;
    const newGrid: string[][] = [];
    const newRevealed: boolean[][] = [];

    const diamondCount = Math.min(3 + currentDepth, 8);
    const bombCount = Math.min(2 + Math.floor(currentDepth / 2), 6);

    for (let i = 0; i < size; i++) {
      newGrid[i] = [];
      newRevealed[i] = [];
      for (let j = 0; j < size; j++) {
        newGrid[i][j] = "empty";
        newRevealed[i][j] = false;
      }
    }

    // Place diamonds
    for (let i = 0; i < diamondCount; i++) {
      let row, col;
      do {
        row = Math.floor(Math.random() * size);
        col = Math.floor(Math.random() * size);
      } while (newGrid[row][col] !== "empty");
      newGrid[row][col] = "diamond";
    }

    // Place bombs
    for (let i = 0; i < bombCount; i++) {
      let row, col;
      do {
        row = Math.floor(Math.random() * size);
        col = Math.floor(Math.random() * size);
      } while (newGrid[row][col] !== "empty");
      newGrid[row][col] = "bomb";
    }

    setGrid(newGrid);
    setRevealed(newRevealed);
  };

  const digTile = async (row: number, col: number) => {
    if (!gameActive || revealed[row][col] || digsRemaining <= 0) return;

    const newRevealed = revealed.map(r => [...r]);
    newRevealed[row][col] = true;
    setRevealed(newRevealed);
    setDigsRemaining((d) => d - 1);

    const tile = grid[row][col];

    if (tile === "diamond") {
      const earned = depth * 5;
      setTotalDiamonds((prev) => prev + earned);
      toast.success(`Found ${earned} 💎!`);
    } else if (tile === "bomb") {
      const lost = Math.floor(totalDiamonds / 2);
      setTotalDiamonds((prev) => prev - lost);
      toast.error(`Hit a bomb! Lost ${lost} 💎`);
    }

    if (digsRemaining - 1 === 0) {
      if (depth >= 10) {
        endGame();
      } else {
        setDepth((d) => d + 1);
        setDigsRemaining(10);
        generateGrid(depth + 1);
        toast.info(`Going deeper! Depth ${depth + 1}`);
      }
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);
    if (userId && totalDiamonds > 0) {
      const { data } = await supabase.from('user_diamonds' as any).select('balance, total_earned').eq('user_id', userId).single();
      if (data) {
        await supabase.from('user_diamonds' as any).update({ balance: (data as any).balance + totalDiamonds, total_earned: (data as any).total_earned + totalDiamonds }).eq('user_id', userId);
      }
    }
    toast.success(`Reached depth ${depth}! Earned ${totalDiamonds} 💎`);
  };

  if (autoStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar />
        <Card className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-xl">Loading game...</p>
        </Card>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar />
        <Card className="max-w-4xl mx-auto p-8 text-center space-y-6">
          <h2 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
            Run Finished!
          </h2>
          <p className="text-xl">Depth Reached: {depth}</p>
          <p className="text-xl">Total Diamonds: {totalDiamonds} 💎</p>
          <p className="text-muted-foreground">Thanks for playing!</p>
          <Button onClick={() => navigate("/dashboard")} size="lg">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <CreditBar />
      
      <Card className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
              Pay Dirt
            </h1>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Depth</p>
              <p className="text-2xl font-bold">{depth}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diamonds</p>
              <p className="text-2xl font-bold">{totalDiamonds} 💎</p>
            </div>
            <div>
              <p className="text-muted-foreground">Digs Left</p>
              <p className="text-2xl font-bold">{digsRemaining}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
            {grid.map((row, rowIdx) =>
              row.map((tile, colIdx) => (
                <Button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => digTile(rowIdx, colIdx)}
                  disabled={!gameActive || revealed[rowIdx][colIdx]}
                  className="h-16 w-16 p-0"
                  variant={revealed[rowIdx][colIdx] ? "secondary" : "default"}
                >
                  {revealed[rowIdx][colIdx] ? (
                    tile === "diamond" ? "💎" : tile === "bomb" ? "💣" : "🪨"
                  ) : (
                    <Pickaxe className="w-6 h-6" />
                  )}
                </Button>
              ))
            )}
          </div>

          {depth < 10 && digsRemaining === 0 && (
            <p className="text-center text-muted-foreground">
              Going deeper automatically...
            </p>
          )}

          <p className="text-sm text-center text-muted-foreground">
            Dig for diamonds! Avoid bombs that cost half your diamonds. Reach depth 10 to win!
          </p>
        </div>
      </Card>
    </div>
  );
}
