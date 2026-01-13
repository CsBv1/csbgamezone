import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sword, Shield, Zap } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { useAudioManager } from "@/hooks/useAudioManager";

interface Unit {
  id: number;
  type: 'warrior' | 'archer' | 'mage';
  hp: number;
  maxHp: number;
  attack: number;
}

interface Battle {
  round: number;
  playerUnits: Unit[];
  enemyUnits: Unit[];
  log: string[];
}

export default function BullCommander() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Commander" 
  });
  const { playSFX, startMusic } = useAudioManager();
  
  // Start music when entering game
  startMusic();
  
  const [gold, setGold] = useState(100);
  const [wave, setWave] = useState(1);
  const [army, setArmy] = useState<Unit[]>([]);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [nextId, setNextId] = useState(1);

  const WAVES_TO_WIN = 5;
  const bonusStats = Math.floor(bullsOwned * 2);

  const UNIT_TYPES = {
    warrior: { cost: 20, hp: 50 + bonusStats, attack: 15 + bonusStats, emoji: '⚔️' },
    archer: { cost: 25, hp: 30 + bonusStats, attack: 20 + bonusStats, emoji: '🏹' },
    mage: { cost: 35, hp: 25 + bonusStats, attack: 30 + bonusStats, emoji: '🔮' },
  };

  const recruit = (type: 'warrior' | 'archer' | 'mage') => {
    const unitType = UNIT_TYPES[type];
    if (gold < unitType.cost || army.length >= 6) {
      playSFX('error');
      return;
    }
    
    playSFX('coin');
    setGold(g => g - unitType.cost);
    setArmy(a => [...a, {
      id: nextId,
      type,
      hp: unitType.hp,
      maxHp: unitType.hp,
      attack: unitType.attack,
    }]);
    setNextId(id => id + 1);
  };

  const generateEnemies = (): Unit[] => {
    const count = 2 + wave;
    const enemies: Unit[] = [];
    const types: Array<'warrior' | 'archer' | 'mage'> = ['warrior', 'archer', 'mage'];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const base = UNIT_TYPES[type];
      enemies.push({
        id: 100 + i,
        type,
        hp: base.hp + wave * 5,
        maxHp: base.hp + wave * 5,
        attack: base.attack + wave * 2,
      });
    }
    return enemies;
  };

  const startBattle = () => {
    if (army.length === 0) {
      playSFX('error');
      return;
    }
    
    playSFX('attack');
    const enemies = generateEnemies();
    simulateBattle([...army], enemies);
  };

  const simulateBattle = (playerUnits: Unit[], enemyUnits: Unit[]) => {
    const log: string[] = [];
    let round = 0;
    
    while (playerUnits.some(u => u.hp > 0) && enemyUnits.some(u => u.hp > 0) && round < 20) {
      round++;
      
      // Player attacks
      const alivePlayer = playerUnits.filter(u => u.hp > 0);
      const aliveEnemy = enemyUnits.filter(u => u.hp > 0);
      
      alivePlayer.forEach(unit => {
        const target = aliveEnemy[Math.floor(Math.random() * aliveEnemy.length)];
        if (target) {
          target.hp -= unit.attack;
          log.push(`Your ${UNIT_TYPES[unit.type].emoji} hits enemy for ${unit.attack} dmg!`);
        }
      });
      
      // Enemy attacks
      const stillAliveEnemy = enemyUnits.filter(u => u.hp > 0);
      const stillAlivePlayer = playerUnits.filter(u => u.hp > 0);
      
      stillAliveEnemy.forEach(unit => {
        const target = stillAlivePlayer[Math.floor(Math.random() * stillAlivePlayer.length)];
        if (target) {
          target.hp -= unit.attack;
          log.push(`Enemy ${UNIT_TYPES[unit.type].emoji} hits you for ${unit.attack} dmg!`);
        }
      });
    }
    
    const playerWon = playerUnits.some(u => u.hp > 0);
    
    setBattle({ round, playerUnits, enemyUnits, log: log.slice(-10) });
    
    if (playerWon) {
      playSFX('win');
      const survivors = playerUnits.filter(u => u.hp > 0);
      setArmy(survivors.map(u => ({ ...u, hp: Math.min(u.hp + 20, u.maxHp) })));
      setGold(g => g + 30 + wave * 10);
      
      if (wave >= WAVES_TO_WIN) {
        playSFX('jackpot');
        setGameOver(true);
        setWon(true);
        const keys = 2 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        awardKeys(keys);
      } else {
        playSFX('levelUp');
        setWave(w => w + 1);
        setTimeout(() => setBattle(null), 2000);
      }
    } else {
      playSFX('lose');
      setGameOver(true);
      setWon(false);
    }
  };

  const resetGame = () => {
    setGold(100);
    setWave(1);
    setArmy([]);
    setBattle(null);
    setGameOver(false);
    setWon(false);
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
            <Sword className="w-8 h-8 text-amber-500" />
            Bull Commander
          </h1>
          <p className="text-muted-foreground">Build your army, conquer {WAVES_TO_WIN} waves!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bonusStats} unit stats</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{won ? '⚔️' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Victory!' : 'Defeat!'}
            </h2>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Command Again</Button>
          </div>
        ) : battle ? (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">Battle in Progress!</h3>
            <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-left">
              {battle.log.map((entry, i) => (
                <p key={i} className={entry.includes('Your') ? 'text-green-400' : 'text-red-400'}>
                  {entry}
                </p>
              ))}
            </div>
            <p className="mt-4 text-lg">
              {battle.playerUnits.some(u => u.hp > 0) ? '🏆 Victory!' : '💀 Defeat!'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>💰 Gold: {gold}</span>
              <span>🌊 Wave: {wave}/{WAVES_TO_WIN}</span>
              <span>🪖 Army: {army.length}/6</span>
            </div>

            {/* Recruit */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.entries(UNIT_TYPES) as [keyof typeof UNIT_TYPES, typeof UNIT_TYPES.warrior][]).map(([type, stats]) => (
                <Button
                  key={type}
                  variant="outline"
                  onClick={() => recruit(type)}
                  disabled={gold < stats.cost || army.length >= 6}
                  className="flex-col h-auto py-3"
                >
                  <span className="text-2xl">{stats.emoji}</span>
                  <span className="capitalize">{type}</span>
                  <span className="text-xs text-muted-foreground">{stats.cost}g</span>
                </Button>
              ))}
            </div>

            {/* Army */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-2">Your Army:</h3>
              {army.length === 0 ? (
                <p className="text-muted-foreground text-center">Recruit units above!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {army.map(unit => (
                    <div key={unit.id} className="bg-card p-2 rounded flex items-center gap-2">
                      <span className="text-xl">{UNIT_TYPES[unit.type].emoji}</span>
                      <div className="text-xs">
                        <div>HP: {unit.hp}</div>
                        <div>ATK: {unit.attack}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={startBattle} 
              disabled={army.length === 0}
              className="w-full" 
              size="lg"
            >
              <Sword className="w-4 h-4 mr-2" />
              Start Battle (Wave {wave})
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
