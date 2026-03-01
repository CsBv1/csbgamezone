import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function BullNexus() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Bull Nexus" });
  const [nodes, setNodes] = useState<boolean[]>(Array(9).fill(false));
  const [energy, setEnergy] = useState(50 + bullsOwned * 5);
  const [connections, setConnections] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);

  const activateNode = (i: number) => {
    if (nodes[i] || energy < 10) return;
    setEnergy(e => e - 10);
    const newNodes = [...nodes];
    newNodes[i] = true;
    setNodes(newNodes);
    
    const adjacent = getAdjacent(i);
    const newConnections = adjacent.filter(a => newNodes[a]).length;
    setConnections(c => {
      const total = c + newConnections;
      if (total >= 12) {
        setGameState('won');
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        awardKeys(keys);
      }
      return total;
    });
  };

  const getAdjacent = (i: number): number[] => {
    const row = Math.floor(i / 3), col = i % 3;
    const adj: number[] = [];
    if (row > 0) adj.push(i - 3);
    if (row < 2) adj.push(i + 3);
    if (col > 0) adj.push(i - 1);
    if (col < 2) adj.push(i + 1);
    return adj;
  };

  const recharge = () => { setEnergy(e => e + 15 + bullsOwned * 2); };
  const resetGame = () => { setNodes(Array(9).fill(false)); setEnergy(50 + bullsOwned * 5); setConnections(0); setGameState('playing'); setKeysEarned(0); };

  if (isLoading) return <div className="min-h-screen bull-pattern flex items-center justify-center"><div className="text-2xl text-primary animate-pulse">Loading...</div></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
        <CreditBar />
      </div>
      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🔗 Bull Nexus</h1>
          <p className="text-muted-foreground">Create 12 connections between nodes!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 5} starting energy</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-2xl font-bold mb-2">Nexus Complete!</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>⚡ Energy: {energy}</span>
              <span>🔗 Connections: {connections}/12</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 max-w-xs mx-auto">
              {nodes.map((active, i) => (
                <Button key={i} variant={active ? "default" : "outline"} className={`h-16 text-2xl ${active ? 'bg-cyan-600' : ''}`}
                  onClick={() => activateNode(i)} disabled={active || energy < 10}>
                  {active ? '⚡' : '○'}
                </Button>
              ))}
            </div>
            <Button onClick={recharge} variant="outline" className="w-full">🔋 Recharge (+{15 + bullsOwned * 2} energy)</Button>
          </>
        )}
      </Card>
    </div>
  );
}
