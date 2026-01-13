import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Swords, Castle } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

interface Tower {
  id: number;
  x: number;
  damage: number;
  range: number;
}

interface Enemy {
  id: number;
  x: number;
  hp: number;
  maxHp: number;
  speed: number;
}

export default function KingdomSiege() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Kingdom Siege" 
  });
  
  const [gold, setGold] = useState(100);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(10);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [keysEarned, setKeysEarned] = useState(0);
  const [nextTowerId, setNextTowerId] = useState(1);
  const [nextEnemyId, setNextEnemyId] = useState(1);

  const TOWER_COST = 25;
  const WAVES_TO_WIN = 5;
  const LANE_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];

  const placeTower = (x: number) => {
    if (gold < TOWER_COST) return;
    if (towers.some(t => t.x === x)) return;
    
    audioManager.playSFX('build');
    setGold(g => g - TOWER_COST);
    setTowers(t => [...t, { id: nextTowerId, x, damage: 10 + bullsOwned, range: 2 }]);
    setNextTowerId(id => id + 1);
  };

  const startWave = () => {
    if (gameState === 'setup' || gameState === 'playing') {
      audioManager.playSFX('buttonPress');
      setGameState('playing');
      const enemyCount = wave + 2;
      const newEnemies: Enemy[] = [];
      for (let i = 0; i < enemyCount; i++) {
        newEnemies.push({
          id: nextEnemyId + i,
          x: -1 - i * 2,
          hp: 30 + wave * 10,
          maxHp: 30 + wave * 10,
          speed: 0.3,
        });
      }
      setEnemies(newEnemies);
      setNextEnemyId(id => id + enemyCount);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing' || enemies.length === 0) return;

    const interval = setInterval(() => {
      setEnemies(prev => {
        let newEnemies = prev.map(e => ({ ...e, x: e.x + e.speed }));
        
        // Tower attacks
        towers.forEach(tower => {
          newEnemies = newEnemies.map(enemy => {
            if (Math.abs(enemy.x - tower.x) <= tower.range && enemy.hp > 0) {
              return { ...enemy, hp: enemy.hp - tower.damage * 0.1 };
            }
            return enemy;
          });
        });
        
        // Remove dead enemies, add gold
        const alive = newEnemies.filter(e => e.hp > 0);
        const killed = newEnemies.length - alive.length;
        if (killed > 0) {
          audioManager.playSFX('hit');
          setGold(g => g + killed * 15);
        }
        
        // Check if enemies reached end
        const reached = alive.filter(e => e.x >= 8);
        if (reached.length > 0) {
          setHp(h => {
            const newHp = h - reached.length;
            if (newHp <= 0) {
              setGameState('lost');
            }
            return Math.max(0, newHp);
          });
        }
        
        const remaining = alive.filter(e => e.x < 8);
        
        // Wave complete
        if (remaining.length === 0 && prev.length > 0) {
          if (wave >= WAVES_TO_WIN) {
            audioManager.playSFX('jackpot');
            setGameState('won');
            const keys = 2 + Math.floor(bullsOwned / 2);
            setKeysEarned(keys);
            awardKeys(keys);
          } else {
            audioManager.playSFX('levelUp');
            setWave(w => w + 1);
            setGameState('setup');
          }
        }
        
        return remaining;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, enemies.length, towers, wave, bullsOwned, awardKeys]);

  const resetGame = () => {
    setGold(100);
    setWave(1);
    setHp(10);
    setTowers([]);
    setEnemies([]);
    setGameState('setup');
    setKeysEarned(0);
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

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Castle className="w-8 h-8 text-amber-500" />
            Kingdom Siege
          </h1>
          <p className="text-muted-foreground">Defend your kingdom for {WAVES_TO_WIN} waves!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned} tower damage</div>
        </div>

        {(gameState === 'won' || gameState === 'lost') ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '🏰' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {gameState === 'won' ? 'Kingdom Saved!' : 'Kingdom Fell!'}
            </h2>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💰 Gold: {Math.floor(gold)}</span>
              <span>🌊 Wave: {wave}/{WAVES_TO_WIN}</span>
              <span>❤️ HP: {hp}</span>
            </div>

            <div className="relative h-32 bg-gradient-to-r from-green-900 to-green-800 rounded-lg mb-4 overflow-hidden">
              {/* Lane */}
              <div className="absolute inset-y-8 left-0 right-0 h-16 bg-amber-900/50 flex items-center">
                {LANE_POSITIONS.map(x => (
                  <div
                    key={x}
                    onClick={() => placeTower(x)}
                    className={`flex-1 h-full border border-amber-700/30 flex items-center justify-center cursor-pointer hover:bg-amber-700/20 transition-colors`}
                  >
                    {towers.find(t => t.x === x) && (
                      <Shield className="w-8 h-8 text-cyan-400" />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Enemies */}
              {enemies.map(enemy => (
                <div
                  key={enemy.id}
                  className="absolute top-12 transition-all"
                  style={{ left: `${(enemy.x / 8) * 100}%` }}
                >
                  <div className="text-2xl">🐃</div>
                  <div className="w-8 h-1 bg-gray-700 rounded">
                    <div 
                      className="h-full bg-red-500 rounded" 
                      style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              
              {/* Castle */}
              <div className="absolute right-2 top-8 text-3xl">🏰</div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => placeTower(towers.length)} 
                disabled={gold < TOWER_COST}
                variant="outline"
                className="flex-1"
              >
                <Shield className="w-4 h-4 mr-2" />
                Place Tower ({TOWER_COST}g)
              </Button>
              <Button 
                onClick={startWave} 
                disabled={gameState === 'playing'}
                className="flex-1"
              >
                <Swords className="w-4 h-4 mr-2" />
                {gameState === 'playing' ? 'Wave in Progress...' : 'Start Wave'}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-2">
              Click lane slots to place towers (cost: {TOWER_COST}g each)
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
