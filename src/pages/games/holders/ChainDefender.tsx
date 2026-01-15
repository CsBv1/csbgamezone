import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Zap, Heart, Coins } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

interface Tower {
  id: number;
  type: 'basic' | 'cannon' | 'laser';
  lane: number;
  damage: number;
  cost: number;
}

interface Enemy {
  id: number;
  hp: number;
  maxHp: number;
  lane: number;
  position: number;
  reward: number;
}

const TOWER_TYPES = {
  basic: { damage: 10, cost: 25, emoji: '🏹', name: 'Archer' },
  cannon: { damage: 25, cost: 50, emoji: '💣', name: 'Cannon' },
  laser: { damage: 40, cost: 100, emoji: '⚡', name: 'Laser' },
};

export default function ChainDefender() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Chain Defender" 
  });
  
  const [gold, setGold] = useState(100);
  const [hp, setHp] = useState(20);
  const [wave, setWave] = useState(1);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [nextTowerId, setNextTowerId] = useState(1);
  const [nextEnemyId, setNextEnemyId] = useState(1);
  
  const maxWaves = 5;
  const lanes = 3;

  const placeTower = (type: keyof typeof TOWER_TYPES, lane: number) => {
    const towerInfo = TOWER_TYPES[type];
    if (gold < towerInfo.cost) {
      audioManager.playSFX('error');
      return;
    }
    
    // Check if lane already has a tower
    if (towers.some(t => t.lane === lane)) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('coin');
    setGold(g => g - towerInfo.cost);
    setTowers(t => [...t, { 
      id: nextTowerId, 
      type, 
      lane, 
      damage: towerInfo.damage,
      cost: towerInfo.cost 
    }]);
    setNextTowerId(id => id + 1);
  };

  const startWave = () => {
    if (waveActive) return;
    
    audioManager.playSFX('buttonPress');
    setWaveActive(true);
    
    // Generate enemies for this wave
    const newEnemies: Enemy[] = [];
    const enemyCount = wave + 2;
    
    for (let i = 0; i < enemyCount; i++) {
      newEnemies.push({
        id: nextEnemyId + i,
        hp: 20 + wave * 10,
        maxHp: 20 + wave * 10,
        lane: Math.floor(Math.random() * lanes),
        position: -10 - i * 5, // Stagger spawn positions
        reward: 10 + wave * 5,
      });
    }
    
    setNextEnemyId(id => id + enemyCount);
    setEnemies(newEnemies);
  };

  // Game loop
  useEffect(() => {
    if (!waveActive || gameOver) return;
    
    const interval = setInterval(() => {
      setEnemies(prevEnemies => {
        // Move enemies forward
        let updatedEnemies = prevEnemies.map(e => ({ ...e, position: e.position + 2 }));
        
        // Towers attack enemies in their lane
        towers.forEach(tower => {
          const enemyInLane = updatedEnemies.find(e => e.lane === tower.lane && e.hp > 0);
          if (enemyInLane) {
            enemyInLane.hp -= tower.damage;
            if (enemyInLane.hp <= 0) {
              audioManager.playSFX('collect');
              setGold(g => g + enemyInLane.reward);
            }
          }
        });
        
        // Filter dead enemies
        updatedEnemies = updatedEnemies.filter(e => e.hp > 0);
        
        // Check for enemies reaching base
        const reachedBase = updatedEnemies.filter(e => e.position >= 100);
        if (reachedBase.length > 0) {
          audioManager.playSFX('lose');
          setHp(h => h - reachedBase.length);
          updatedEnemies = updatedEnemies.filter(e => e.position < 100);
        }
        
        // Check if wave complete
        if (updatedEnemies.length === 0 && prevEnemies.length > 0) {
          audioManager.playSFX('levelUp');
          setWaveActive(false);
          
          if (wave >= maxWaves) {
            // Win!
            setWon(true);
            setGameOver(true);
          }
        }
        
        return updatedEnemies;
      });
      
      // Check HP
      setHp(h => {
        if (h <= 0) {
          setGameOver(true);
          return 0;
        }
        return h;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [waveActive, gameOver, towers, wave]);

  // Award keys on win
  useEffect(() => {
    const doAward = async () => {
      if (gameOver && won) {
        const keys = 1 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        await awardKeys(keys);
        audioManager.playSFX('jackpot');
      }
    };
    doAward();
  }, [gameOver, won]);

  const resetGame = () => {
    setGold(100);
    setHp(20);
    setWave(1);
    setTowers([]);
    setEnemies([]);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
    setWaveActive(false);
  };

  const nextWave = () => {
    setWave(w => w + 1);
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
            <Shield className="w-8 h-8 text-blue-500" />
            Chain Defender
          </h1>
          <p className="text-muted-foreground">Defend against {maxWaves} waves!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{won ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Victory!' : 'Base Destroyed!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">Reached Wave {wave}</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Defend Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex justify-between items-center mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">{gold}g</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="font-bold">Wave {wave}/{maxWaves}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="font-bold text-red-400">{hp} HP</span>
              </div>
            </div>

            {/* Lanes */}
            <div className="space-y-2 mb-4">
              {Array(lanes).fill(0).map((_, lane) => {
                const tower = towers.find(t => t.lane === lane);
                const laneEnemies = enemies.filter(e => e.lane === lane);
                
                return (
                  <div key={lane} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                    {/* Tower slot */}
                    <div className="w-12 h-12 flex items-center justify-center bg-muted/40 rounded-lg text-2xl">
                      {tower ? TOWER_TYPES[tower.type].emoji : '➕'}
                    </div>
                    
                    {/* Lane path */}
                    <div className="flex-1 h-10 bg-muted/30 rounded relative overflow-hidden">
                      {laneEnemies.map(enemy => (
                        <div 
                          key={enemy.id}
                          className="absolute top-1/2 -translate-y-1/2 text-xl transition-all"
                          style={{ left: `${Math.min(90, Math.max(0, enemy.position))}%` }}
                        >
                          👹
                        </div>
                      ))}
                    </div>
                    
                    {/* Base */}
                    <div className="text-xl">🏰</div>
                  </div>
                );
              })}
            </div>

            {/* Tower shop */}
            {!waveActive && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Place towers (1 per lane):</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TOWER_TYPES).map(([type, info]) => (
                    <div key={type} className="text-center">
                      <div className="text-xl mb-1">{info.emoji}</div>
                      <p className="text-xs">{info.name}</p>
                      <p className="text-xs text-yellow-400">{info.cost}g</p>
                      <div className="flex gap-1 justify-center mt-1">
                        {Array(lanes).fill(0).map((_, lane) => (
                          <Button
                            key={lane}
                            size="sm"
                            variant="outline"
                            className="w-6 h-6 p-0 text-xs"
                            disabled={gold < info.cost || towers.some(t => t.lane === lane)}
                            onClick={() => placeTower(type as keyof typeof TOWER_TYPES, lane)}
                          >
                            {lane + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wave controls */}
            {!waveActive ? (
              <Button onClick={startWave} className="w-full" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Start Wave {wave}
              </Button>
            ) : (
              <div className="text-center p-4 bg-red-500/20 rounded-lg">
                <p className="text-lg font-bold animate-pulse">⚔️ Wave {wave} in progress...</p>
              </div>
            )}
            
            {!waveActive && wave > 1 && wave <= maxWaves && (
              <Button onClick={nextWave} variant="outline" className="w-full mt-2">
                Prepare Wave {wave}
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
