import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, RotateCcw, Trophy } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

interface Block {
  id: number;
  value: number;
  merged: boolean;
}

export default function StrategicStacks() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Strategic Stacks" 
  });
  
  const [grid, setGrid] = useState<(Block | null)[][]>(() => initGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [nextId, setNextId] = useState(3);

  const TARGET_SCORE = 2048;
  const bonusScore = bullsOwned * 100;

  function initGrid(): (Block | null)[][] {
    const grid: (Block | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
    // Add two initial blocks
    addRandomBlock(grid);
    addRandomBlock(grid);
    return grid;
  }

  function addRandomBlock(grid: (Block | null)[][]) {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return false;
    
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    grid[r][c] = { id: Math.random(), value, merged: false };
    return true;
  }

  const move = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;
    
    const newGrid = grid.map(row => row.map(cell => cell ? { ...cell, merged: false } : null));
    let moved = false;
    let scoreGain = 0;
    
    const processLine = (line: (Block | null)[]): (Block | null)[] => {
      // Remove nulls
      const filtered = line.filter(Boolean) as Block[];
      const result: (Block | null)[] = [];
      
      let i = 0;
      while (i < filtered.length) {
        if (i + 1 < filtered.length && filtered[i].value === filtered[i + 1].value && !filtered[i].merged && !filtered[i + 1].merged) {
          const newValue = filtered[i].value * 2;
          result.push({ id: Math.random(), value: newValue, merged: true });
          scoreGain += newValue;
          i += 2;
        } else {
          result.push(filtered[i]);
          i++;
        }
      }
      
      // Pad with nulls
      while (result.length < 4) {
        result.push(null);
      }
      
      return result;
    };
    
    if (direction === 'left' || direction === 'right') {
      for (let r = 0; r < 4; r++) {
        const line = direction === 'left' ? [...newGrid[r]] : [...newGrid[r]].reverse();
        const processed = processLine(line);
        const final = direction === 'left' ? processed : processed.reverse();
        
        for (let c = 0; c < 4; c++) {
          if (newGrid[r][c]?.id !== final[c]?.id) moved = true;
          newGrid[r][c] = final[c];
        }
      }
    } else {
      for (let c = 0; c < 4; c++) {
        const line = direction === 'up' 
          ? [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]]
          : [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
        
        const processed = processLine(line);
        const final = direction === 'up' ? processed : processed.reverse();
        
        for (let r = 0; r < 4; r++) {
          if (newGrid[r][c]?.id !== final[r]?.id) moved = true;
          newGrid[r][c] = final[r];
        }
      }
    }
    
    if (moved) {
      addRandomBlock(newGrid);
      setGrid(newGrid);
      setScore(s => s + scoreGain);
      
      // Check win
      const maxValue = Math.max(...newGrid.flat().filter(Boolean).map(b => b!.value));
      if (maxValue >= TARGET_SCORE && !won) {
        handleWin();
      }
      
      // Check game over
      if (!canMove(newGrid)) {
        setGameOver(true);
      }
    }
  };

  const canMove = (grid: (Block | null)[][]): boolean => {
    // Check for empty cells
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) return true;
        // Check adjacent same values
        if (r < 3 && grid[r][c]?.value === grid[r + 1][c]?.value) return true;
        if (c < 3 && grid[r][c]?.value === grid[r][c + 1]?.value) return true;
      }
    }
    return false;
  };

  const handleWin = async () => {
    setWon(true);
    const keys = 3 + Math.floor(bullsOwned / 2);
    setKeysEarned(keys);
    await awardKeys(keys);
  };

  const resetGame = () => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver]);

  const getBlockColor = (value: number): string => {
    const colors: { [key: number]: string } = {
      2: 'bg-amber-100 text-amber-900',
      4: 'bg-amber-200 text-amber-900',
      8: 'bg-orange-300 text-white',
      16: 'bg-orange-400 text-white',
      32: 'bg-orange-500 text-white',
      64: 'bg-red-500 text-white',
      128: 'bg-yellow-400 text-white',
      256: 'bg-yellow-500 text-white',
      512: 'bg-yellow-600 text-white',
      1024: 'bg-yellow-700 text-white',
      2048: 'bg-amber-500 text-white',
    };
    return colors[value] || 'bg-purple-500 text-white';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-md mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Layers className="w-8 h-8 text-amber-500" />
            Strategic Stacks
          </h1>
          <p className="text-muted-foreground">Reach {TARGET_SCORE} to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        <div className="flex justify-between mb-4">
          <div className="bg-muted/50 rounded px-4 py-2">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="text-xl font-bold">{score}</div>
          </div>
          <Button variant="outline" size="sm" onClick={resetGame}>
            <RotateCcw className="w-4 h-4 mr-2" /> New Game
          </Button>
        </div>

        {won && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="font-bold text-green-400">You Win!</p>
            {keysEarned > 0 && <p className="text-amber-400">+{keysEarned} 🔑 earned!</p>}
          </div>
        )}

        {gameOver && !won && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 text-center">
            <p className="font-bold text-red-400">Game Over!</p>
            <p className="text-sm">Final Score: {score}</p>
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-2 mb-4">
          <div className="grid grid-cols-4 gap-2">
            {grid.map((row, r) => row.map((block, c) => (
              <div
                key={`${r}-${c}`}
                className={`aspect-square rounded flex items-center justify-center font-bold text-lg transition-all ${
                  block ? getBlockColor(block.value) : 'bg-muted/50'
                } ${block?.merged ? 'scale-110' : 'scale-100'}`}
              >
                {block?.value || ''}
              </div>
            )))}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
          <div></div>
          <Button variant="outline" size="sm" onClick={() => move('up')}>↑</Button>
          <div></div>
          <Button variant="outline" size="sm" onClick={() => move('left')}>←</Button>
          <Button variant="outline" size="sm" onClick={() => move('down')}>↓</Button>
          <Button variant="outline" size="sm" onClick={() => move('right')}>→</Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Use arrow keys or buttons to slide tiles
        </p>
      </Card>
    </div>
  );
}
