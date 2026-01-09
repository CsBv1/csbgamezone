import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Swords } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

type Piece = 'bull' | 'knight' | 'rook' | 'empty';
type Player = 'player' | 'ai';

interface Cell {
  piece: Piece;
  owner: Player | null;
}

export default function BullTactician() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Tactician" 
  });
  
  const [board, setBoard] = useState<Cell[][]>(() => initBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<Player>('player');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [keysEarned, setKeysEarned] = useState(0);

  function initBoard(): Cell[][] {
    const board: Cell[][] = Array(6).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ piece: 'empty' as Piece, owner: null }))
    );
    // Player pieces (bottom)
    board[5][0] = { piece: 'rook', owner: 'player' };
    board[5][2] = { piece: 'bull', owner: 'player' };
    board[5][3] = { piece: 'bull', owner: 'player' };
    board[5][5] = { piece: 'rook', owner: 'player' };
    board[4][1] = { piece: 'knight', owner: 'player' };
    board[4][4] = { piece: 'knight', owner: 'player' };
    // AI pieces (top)
    board[0][0] = { piece: 'rook', owner: 'ai' };
    board[0][2] = { piece: 'bull', owner: 'ai' };
    board[0][3] = { piece: 'bull', owner: 'ai' };
    board[0][5] = { piece: 'rook', owner: 'ai' };
    board[1][1] = { piece: 'knight', owner: 'ai' };
    board[1][4] = { piece: 'knight', owner: 'ai' };
    return board;
  }

  const canMove = (from: [number, number], to: [number, number]): boolean => {
    const [fr, fc] = from;
    const [tr, tc] = to;
    const piece = board[fr][fc];
    const target = board[tr][tc];
    
    if (target.owner === piece.owner) return false;
    
    const dr = Math.abs(tr - fr);
    const dc = Math.abs(tc - fc);
    
    switch (piece.piece) {
      case 'bull': return dr <= 1 && dc <= 1;
      case 'knight': return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
      case 'rook': return (dr === 0 || dc === 0) && dr + dc <= 3;
      default: return false;
    }
  };

  const handleClick = (row: number, col: number) => {
    if (gameOver || turn !== 'player') return;
    
    const cell = board[row][col];
    
    if (selected) {
      if (canMove(selected, [row, col])) {
        const newBoard = board.map(r => r.map(c => ({ ...c })));
        const captured = newBoard[row][col];
        newBoard[row][col] = newBoard[selected[0]][selected[1]];
        newBoard[selected[0]][selected[1]] = { piece: 'empty', owner: null };
        setBoard(newBoard);
        setSelected(null);
        
        // Check if captured AI bull
        if (captured.piece === 'bull' && captured.owner === 'ai') {
          const aiBulls = newBoard.flat().filter(c => c.piece === 'bull' && c.owner === 'ai');
          if (aiBulls.length === 0) {
            endGame('player');
            return;
          }
        }
        
        setTurn('ai');
        setTimeout(() => aiMove(newBoard), 500);
      } else {
        setSelected(null);
      }
    } else if (cell.owner === 'player') {
      setSelected([row, col]);
    }
  };

  const aiMove = (currentBoard: Cell[][]) => {
    const aiPieces: [number, number][] = [];
    currentBoard.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.owner === 'ai') aiPieces.push([r, c]);
    }));
    
    // Try to capture player pieces
    for (const [fr, fc] of aiPieces) {
      for (let tr = 0; tr < 6; tr++) {
        for (let tc = 0; tc < 6; tc++) {
          if (canMoveOnBoard(currentBoard, [fr, fc], [tr, tc]) && currentBoard[tr][tc].owner === 'player') {
            executeMove(currentBoard, [fr, fc], [tr, tc]);
            return;
          }
        }
      }
    }
    
    // Random move
    const shuffled = aiPieces.sort(() => Math.random() - 0.5);
    for (const [fr, fc] of shuffled) {
      const moves: [number, number][] = [];
      for (let tr = 0; tr < 6; tr++) {
        for (let tc = 0; tc < 6; tc++) {
          if (canMoveOnBoard(currentBoard, [fr, fc], [tr, tc])) moves.push([tr, tc]);
        }
      }
      if (moves.length > 0) {
        const [tr, tc] = moves[Math.floor(Math.random() * moves.length)];
        executeMove(currentBoard, [fr, fc], [tr, tc]);
        return;
      }
    }
    
    endGame('player'); // AI can't move
  };

  const canMoveOnBoard = (b: Cell[][], from: [number, number], to: [number, number]): boolean => {
    const [fr, fc] = from;
    const [tr, tc] = to;
    const piece = b[fr][fc];
    const target = b[tr][tc];
    if (target.owner === piece.owner) return false;
    const dr = Math.abs(tr - fr);
    const dc = Math.abs(tc - fc);
    switch (piece.piece) {
      case 'bull': return dr <= 1 && dc <= 1;
      case 'knight': return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
      case 'rook': return (dr === 0 || dc === 0) && dr + dc <= 3;
      default: return false;
    }
  };

  const executeMove = (currentBoard: Cell[][], from: [number, number], to: [number, number]) => {
    const newBoard = currentBoard.map(r => r.map(c => ({ ...c })));
    const captured = newBoard[to[0]][to[1]];
    newBoard[to[0]][to[1]] = newBoard[from[0]][from[1]];
    newBoard[from[0]][from[1]] = { piece: 'empty', owner: null };
    setBoard(newBoard);
    
    if (captured.piece === 'bull' && captured.owner === 'player') {
      const playerBulls = newBoard.flat().filter(c => c.piece === 'bull' && c.owner === 'player');
      if (playerBulls.length === 0) {
        endGame('ai');
        return;
      }
    }
    
    setTurn('player');
  };

  const endGame = async (w: Player) => {
    setGameOver(true);
    setWinner(w);
    if (w === 'player') {
      const keys = 1 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    }
  };

  const resetGame = () => {
    setBoard(initBoard());
    setSelected(null);
    setTurn('player');
    setGameOver(false);
    setWinner(null);
    setKeysEarned(0);
  };

  const getPieceEmoji = (cell: Cell): string => {
    if (cell.piece === 'empty') return '';
    const isPlayer = cell.owner === 'player';
    switch (cell.piece) {
      case 'bull': return isPlayer ? '🐂' : '🐃';
      case 'knight': return isPlayer ? '♞' : '♘';
      case 'rook': return isPlayer ? '♜' : '♖';
      default: return '';
    }
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

      <Card className="max-w-lg mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Swords className="w-8 h-8 text-amber-500" />
            Bull Tactician
          </h1>
          <p className="text-muted-foreground">Capture all enemy bulls to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{winner === 'player' ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {winner === 'player' ? 'Victory!' : 'Defeat!'}
            </h2>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className={`px-3 py-1 rounded-full ${turn === 'player' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {turn === 'player' ? 'Your Turn' : 'AI Thinking...'}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-4">
              {board.map((row, r) => row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleClick(r, c)}
                  className={`aspect-square text-2xl flex items-center justify-center rounded transition-all
                    ${(r + c) % 2 === 0 ? 'bg-amber-900/50' : 'bg-amber-800/30'}
                    ${selected?.[0] === r && selected?.[1] === c ? 'ring-2 ring-primary' : ''}
                    ${cell.owner === 'player' ? 'hover:bg-primary/20' : ''}
                  `}
                >
                  {getPieceEmoji(cell)}
                </button>
              )))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>🐂/🐃 Bull (1 square) | ♞/♘ Knight (L-shape) | ♜/♖ Rook (3 straight)</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
