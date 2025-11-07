import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GEMS = ["💎", "💚", "💙", "🟡", "🔴"];
const GRID_SIZE = 6;

export default function GemChain() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [grid, setGrid] = useState<string[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState(20);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first!");
        navigate("/dashboard");
        return;
      }
      setUserId(user.id);

      const { data: keysData } = await supabase
        .from('user_keys' as any)
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!keysData || (keysData as any).balance < 1) {
        toast.error("You need a key to enter! 🔑");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      const { error: keyError } = await supabase
        .from('user_keys' as any)
        .update({ balance: (keysData as any).balance - 1 })
        .eq('user_id', user.id);

      if (keyError) {
        toast.error("Failed to use key!");
        navigate("/dashboard");
        return;
      }

      toast.success("Key used! Game starting...");
      generateGrid();
      setGameActive(true);
      setAutoStarting(false);
    };

    init();
  }, []);

  const generateGrid = () => {
    const newGrid: string[][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      newGrid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[i][j] = GEMS[Math.floor(Math.random() * GEMS.length)];
      }
    }
    setGrid(newGrid);
  };

  const selectGem = (row: number, col: number) => {
    if (!gameActive) return;

    if (selected === null) {
      setSelected([row, col]);
    } else {
      const [selRow, selCol] = selected;
      // Check if adjacent
      if (
        (Math.abs(row - selRow) === 1 && col === selCol) ||
        (Math.abs(col - selCol) === 1 && row === selRow)
      ) {
        swapGems(selRow, selCol, row, col);
      }
      setSelected(null);
    }
  };

  const swapGems = (row1: number, col1: number, row2: number, col2: number) => {
    const newGrid = [...grid.map(row => [...row])];
    const temp = newGrid[row1][col1];
    newGrid[row1][col1] = newGrid[row2][col2];
    newGrid[row2][col2] = temp;
    setGrid(newGrid);

    setTimeout(() => checkMatches(newGrid), 100);
    setMoves(m => m - 1);
  };

  const checkMatches = (currentGrid: string[][]) => {
    let matches: [number, number][] = [];

    // Check horizontal
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 2; j++) {
        if (
          currentGrid[i][j] === currentGrid[i][j + 1] &&
          currentGrid[i][j] === currentGrid[i][j + 2]
        ) {
          matches.push([i, j], [i, j + 1], [i, j + 2]);
        }
      }
    }

    // Check vertical
    for (let i = 0; i < GRID_SIZE - 2; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (
          currentGrid[i][j] === currentGrid[i + 1][j] &&
          currentGrid[i][j] === currentGrid[i + 2][j]
        ) {
          matches.push([i, j], [i + 1, j], [i + 2, j]);
        }
      }
    }

    if (matches.length > 0) {
      const points = matches.length * 10 * level;
      setScore(s => s + points);
      toast.success(`Match! +${points} points`);

      // Check level up
      if (score + points >= level * 200) {
        if (level >= 10) {
          endGame();
          return;
        }
        setLevel(l => l + 1);
        setMoves(m => m + 10);
        toast.info(`Level ${level + 1}!`);
      }

      // Remove matches and fill
      const newGrid = [...currentGrid.map(row => [...row])];
      matches.forEach(([r, c]) => {
        newGrid[r][c] = GEMS[Math.floor(Math.random() * GEMS.length)];
      });
      setGrid(newGrid);
    }

    if (moves <= 1 && matches.length === 0) {
      endGame();
    }
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);

    const diamonds = Math.floor(score / 20);
    setTotalDiamonds(diamonds);

    if (userId && diamonds > 0) {
      const { data } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      if (data) {
        await supabase
          .from('user_diamonds' as any)
          .update({
            balance: (data as any).balance + diamonds,
            total_earned: (data as any).total_earned + diamonds
          })
          .eq('user_id', userId);
      }
    }
    toast.success(`Game complete! Earned ${diamonds} 💎`);
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
            Gem Chain Complete!
          </h2>
          <p className="text-xl">Level Reached: {level}</p>
          <p className="text-xl">Final Score: {score}</p>
          <p className="text-xl">Diamonds Earned: {totalDiamonds} 💎</p>
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
              💎 Gem Chain
            </h1>
            <Button onClick={() => endGame()} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Level</p>
              <p className="text-2xl font-bold">{level}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{score}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Moves</p>
              <p className="text-2xl font-bold">{moves}</p>
            </div>
          </div>

          {/* Grid */}
          <div className="flex justify-center">
            <div className="grid grid-cols-6 gap-2 p-4 bg-gradient-to-b from-primary/20 to-background border-2 border-primary/40 rounded-lg">
              {grid.map((row, i) =>
                row.map((gem, j) => (
                  <Button
                    key={`${i}-${j}`}
                    onClick={() => selectGem(i, j)}
                    variant={selected?.[0] === i && selected?.[1] === j ? "default" : "outline"}
                    className="w-16 h-16 text-3xl p-0"
                  >
                    {gem}
                  </Button>
                ))
              )}
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Match 3 or more gems in a row! Reach level 10 to complete the game!
          </p>
        </div>
      </Card>
    </div>
  );
}
