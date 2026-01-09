import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Map, Flag, Swords } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

interface Territory {
  id: number;
  name: string;
  owner: 'player' | 'enemy' | 'neutral';
  troops: number;
  adjacent: number[];
}

export default function CardanoConquest() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Cardano Conquest" 
  });
  
  const bonusTroops = Math.floor(bullsOwned * 2);
  
  const [territories, setTerritories] = useState<Territory[]>([
    { id: 0, name: 'Capital', owner: 'player', troops: 10 + bonusTroops, adjacent: [1, 2] },
    { id: 1, name: 'Northern Plains', owner: 'neutral', troops: 5, adjacent: [0, 2, 3] },
    { id: 2, name: 'Southern Hills', owner: 'neutral', troops: 5, adjacent: [0, 1, 4] },
    { id: 3, name: 'Eastern Forest', owner: 'neutral', troops: 8, adjacent: [1, 4, 5] },
    { id: 4, name: 'Western Desert', owner: 'neutral', troops: 8, adjacent: [2, 3, 5] },
    { id: 5, name: 'Enemy Stronghold', owner: 'enemy', troops: 15, adjacent: [3, 4] },
  ]);
  
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [message, setMessage] = useState('Select your territory to attack from!');

  const attack = (fromId: number, toId: number) => {
    const from = territories.find(t => t.id === fromId)!;
    const to = territories.find(t => t.id === toId)!;
    
    if (from.owner !== 'player' || from.troops <= 1) return;
    if (!from.adjacent.includes(toId)) return;
    if (to.owner === 'player') return;
    
    const attackPower = from.troops - 1;
    const defensePower = to.troops;
    
    // Simple combat: attacker loses less if stronger
    const attackerLoss = Math.max(1, Math.floor(defensePower * 0.6));
    const defenderLoss = Math.max(1, Math.floor(attackPower * 0.8));
    
    const newTerritories = territories.map(t => {
      if (t.id === fromId) {
        return { ...t, troops: Math.max(1, t.troops - attackerLoss) };
      }
      if (t.id === toId) {
        const newTroops = t.troops - defenderLoss;
        if (newTroops <= 0) {
          return { ...t, owner: 'player' as const, troops: Math.max(1, attackPower - attackerLoss) };
        }
        return { ...t, troops: newTroops };
      }
      return t;
    });
    
    setTerritories(newTerritories);
    setSelected(null);
    
    // Check win/lose
    const enemyTerritories = newTerritories.filter(t => t.owner === 'enemy');
    const playerTerritories = newTerritories.filter(t => t.owner === 'player');
    
    if (enemyTerritories.length === 0) {
      endGame(true);
    } else if (playerTerritories.length === 0) {
      endGame(false);
    } else {
      enemyTurn(newTerritories);
    }
  };

  const enemyTurn = (currentTerritories: Territory[]) => {
    setMessage('Enemy is attacking...');
    
    setTimeout(() => {
      const enemyTerrs = currentTerritories.filter(t => t.owner === 'enemy' && t.troops > 1);
      
      if (enemyTerrs.length === 0) {
        endTurn(currentTerritories);
        return;
      }
      
      // Enemy attacks random adjacent non-enemy territory
      const attacker = enemyTerrs[Math.floor(Math.random() * enemyTerrs.length)];
      const targets = attacker.adjacent
        .map(id => currentTerritories.find(t => t.id === id)!)
        .filter(t => t.owner !== 'enemy');
      
      if (targets.length === 0) {
        endTurn(currentTerritories);
        return;
      }
      
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      const attackPower = attacker.troops - 1;
      const defensePower = target.troops;
      const attackerLoss = Math.max(1, Math.floor(defensePower * 0.6));
      const defenderLoss = Math.max(1, Math.floor(attackPower * 0.8));
      
      const newTerritories = currentTerritories.map(t => {
        if (t.id === attacker.id) {
          return { ...t, troops: Math.max(1, t.troops - attackerLoss) };
        }
        if (t.id === target.id) {
          const newTroops = t.troops - defenderLoss;
          if (newTroops <= 0) {
            return { ...t, owner: 'enemy' as const, troops: Math.max(1, attackPower - attackerLoss) };
          }
          return { ...t, troops: newTroops };
        }
        return t;
      });
      
      setTerritories(newTerritories);
      
      const playerTerritories = newTerritories.filter(t => t.owner === 'player');
      if (playerTerritories.length === 0) {
        endGame(false);
      } else {
        endTurn(newTerritories);
      }
    }, 1000);
  };

  const endTurn = (currentTerritories: Territory[]) => {
    // Add reinforcements
    const playerCount = currentTerritories.filter(t => t.owner === 'player').length;
    const reinforcements = Math.max(1, Math.floor(playerCount / 2));
    
    const reinforced = currentTerritories.map(t => {
      if (t.owner === 'player') {
        return { ...t, troops: t.troops + reinforcements };
      }
      if (t.owner === 'enemy') {
        return { ...t, troops: t.troops + 1 };
      }
      return t;
    });
    
    setTerritories(reinforced);
    setTurn(t => t + 1);
    setMessage(`Turn ${turn + 1}: +${reinforcements} troops to each territory!`);
  };

  const endGame = async (won: boolean) => {
    setGameOver(true);
    setWon(won);
    if (won) {
      const keys = 3 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    }
  };

  const resetGame = () => {
    setTerritories([
      { id: 0, name: 'Capital', owner: 'player', troops: 10 + bonusTroops, adjacent: [1, 2] },
      { id: 1, name: 'Northern Plains', owner: 'neutral', troops: 5, adjacent: [0, 2, 3] },
      { id: 2, name: 'Southern Hills', owner: 'neutral', troops: 5, adjacent: [0, 1, 4] },
      { id: 3, name: 'Eastern Forest', owner: 'neutral', troops: 8, adjacent: [1, 4, 5] },
      { id: 4, name: 'Western Desert', owner: 'neutral', troops: 8, adjacent: [2, 3, 5] },
      { id: 5, name: 'Enemy Stronghold', owner: 'enemy', troops: 15, adjacent: [3, 4] },
    ]);
    setSelected(null);
    setTurn(1);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
    setMessage('Select your territory to attack from!');
  };

  const handleClick = (id: number) => {
    const territory = territories.find(t => t.id === id)!;
    
    if (selected === null) {
      if (territory.owner === 'player' && territory.troops > 1) {
        setSelected(id);
        setMessage(`Selected ${territory.name}. Click adjacent territory to attack!`);
      }
    } else {
      if (id === selected) {
        setSelected(null);
        setMessage('Attack cancelled.');
      } else if (territory.owner !== 'player' && territories.find(t => t.id === selected)!.adjacent.includes(id)) {
        attack(selected, id);
      }
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

  const getColor = (owner: string) => {
    switch (owner) {
      case 'player': return 'bg-blue-600 hover:bg-blue-500';
      case 'enemy': return 'bg-red-600 hover:bg-red-500';
      default: return 'bg-gray-600 hover:bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Map className="w-8 h-8 text-amber-500" />
            Cardano Conquest
          </h1>
          <p className="text-muted-foreground">Conquer all territories to win!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bonusTroops} starting troops</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{won ? '🏴' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Total Domination!' : 'Conquered!'}
            </h2>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Conquer Again</Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className="text-sm">Turn {turn}</span>
              <p className="text-muted-foreground text-sm">{message}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {territories.map(territory => (
                <button
                  key={territory.id}
                  onClick={() => handleClick(territory.id)}
                  className={`p-4 rounded-lg transition-all ${getColor(territory.owner)} ${
                    selected === territory.id ? 'ring-4 ring-yellow-400' : ''
                  } ${
                    selected !== null && territories.find(t => t.id === selected)?.adjacent.includes(territory.id) && territory.owner !== 'player'
                      ? 'ring-2 ring-red-400'
                      : ''
                  }`}
                >
                  <div className="text-lg font-bold">{territory.name}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Flag className="w-4 h-4" />
                    <span>{territory.troops}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-blue-600"></div> You
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-red-600"></div> Enemy
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gray-600"></div> Neutral
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
