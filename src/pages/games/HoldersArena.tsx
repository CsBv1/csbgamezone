import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crown, Sword, Shield, Key, Flame, Skull, Heart, Zap, Target, Coins, Gem, Timer, Dice1 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreditBar } from "@/components/CreditBar";

type GameType = 'menu' | 'bull-quest' | 'battle-arena' | 'treasure-hunt' | 'key-slots' | 'bull-dice' | 'speed-keys' | 'key-match' | 'bull-gauntlet';

// Sound effects using Web Audio API
const playSound = (type: 'hit' | 'collect' | 'win' | 'lose' | 'click' | 'power') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    switch(type) {
      case 'hit':
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
        break;
      case 'collect':
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        break;
      case 'win':
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;
      case 'lose':
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case 'click':
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
        break;
      case 'power':
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
    }
  } catch (e) {
    // Audio not supported
  }
};

// Haptic feedback
const vibrate = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export default function HoldersArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bullsOwned, setBullsOwned] = useState(0);
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  const [pendingKeys, setPendingKeys] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", variant: "destructive" });
        navigate('/games/bull-world');
        return;
      }
      
      setUserId(user.id);
      
      const { data: nftData } = await supabase
        .from('user_nft_bonuses')
        .select('bulls_owned')
        .eq('user_id', user.id)
        .single();
      
      if (!nftData || (nftData as any).bulls_owned === 0) {
        toast({ 
          title: "🔒 Holders Only", 
          description: "You need to hold a CSB Bull NFT to access this arena!", 
          variant: "destructive" 
        });
        navigate('/games/bull-world');
        return;
      }
      
      setBullsOwned((nftData as any).bulls_owned);
      setIsLoading(false);
    };
    
    init();
  }, []);

  const saveKeysToWallet = async (amount: number): Promise<boolean> => {
    if (!userId || amount <= 0) {
      console.log('[Keys] No userId or invalid amount:', { userId, amount });
      return false;
    }
    
    try {
      console.log('[Keys] Saving keys to wallet:', { userId, amount });
      
      // First check if user has keys record
      const { data: current, error: fetchError } = await supabase
        .from('user_keys')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('[Keys] Error fetching current balance:', fetchError);
        throw fetchError;
      }
      
      let updateError;
      
      if (current && (current as any).balance !== undefined) {
        // Update existing record
        const newBalance = ((current as any).balance || 0) + amount;
        console.log('[Keys] Updating existing balance:', { old: (current as any).balance, new: newBalance });
        
        const { error } = await supabase
          .from('user_keys')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        updateError = error;
      } else {
        // Insert new record
        console.log('[Keys] Creating new keys record with balance:', amount);
        
        const { error } = await supabase
          .from('user_keys')
          .insert({ user_id: userId, balance: amount });
        updateError = error;
      }
      
      if (updateError) {
        console.error('[Keys] Error saving keys:', updateError);
        throw updateError;
      }
      
      console.log('[Keys] Successfully saved keys to wallet!');
      toast({ title: `+${amount} 🔑 saved to wallet!`, description: "Keys added to your balance!" });
      return true;
    } catch (e) {
      console.error('[Keys] Failed to save keys:', e);
      toast({ title: "Failed to save keys", description: "Please try again", variant: "destructive" });
      return false;
    }
  };

  const awardKeys = async (amount: number): Promise<boolean> => {
    if (amount <= 0) return false;
    
    console.log('[Keys] Awarding keys:', amount);
    playSound('win');
    vibrate([100, 50, 100, 50, 200]);
    
    // Save keys immediately to wallet and wait for completion
    const success = await saveKeysToWallet(amount);
    
    if (!success) {
      toast({ title: `Earned ${amount} 🔑`, description: "But failed to save - please report this!", variant: "destructive" });
    }
    
    return success;
  };

  const goBack = async () => {
    playSound('click');
    vibrate(30);
    
    // Save any pending keys when leaving
    if (pendingKeys > 0) {
      await saveKeysToWallet(pendingKeys);
      setPendingKeys(0);
    }
    
    if (currentGame !== 'menu') {
      setCurrentGame('menu');
    } else {
      const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
      navigate(fromBullWorld ? '/games/bull-world' : '/');
    }
  };
  
  // Auto-save keys when switching games
  const handleGameChange = async (game: GameType) => {
    if (pendingKeys > 0) {
      await saveKeysToWallet(pendingKeys);
      setPendingKeys(0);
    }
    playSound('click');
    vibrate(50);
    setCurrentGame(game);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Card className="p-8 text-center bg-[#0d2137] border-[#FFD700]/30">
          <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-[#FFD700]">Entering Holders Arena...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#FFD700] hover:bg-[#FFD700]/10" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {currentGame !== 'menu' ? 'Back' : 'Exit'}
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-[#FFD700]" />
            Holders Arena
            <Crown className="w-6 h-6 text-[#FFD700]" />
          </h1>
          <p className="text-[#FFD700]/60 text-sm">Exclusive RPG for {bullsOwned} Bull Holders!</p>
        </div>

        {currentGame === 'menu' && (
          <GameMenu onSelectGame={handleGameChange} />
        )}
        
        {currentGame === 'bull-quest' && (
          <BullQuestGame onWin={awardKeys} />
        )}
        
        {currentGame === 'battle-arena' && (
          <BattleArenaGame onWin={awardKeys} />
        )}
        
        {currentGame === 'treasure-hunt' && (
          <TreasureHuntGame onWin={awardKeys} />
        )}
        
        {currentGame === 'key-slots' && (
          <KeySlotsGame onWin={awardKeys} />
        )}
        
        {currentGame === 'bull-dice' && (
          <BullDiceGame onWin={awardKeys} />
        )}
        
        {currentGame === 'speed-keys' && (
          <SpeedKeysGame onWin={awardKeys} />
        )}
        
        {currentGame === 'key-match' && (
          <KeyMatchGame onWin={awardKeys} />
        )}
        
        {currentGame === 'bull-gauntlet' && (
          <BullGauntletGame onWin={awardKeys} />
        )}
      </div>
    </div>
  );
}

// Game Menu Component
function GameMenu({ onSelectGame }: { onSelectGame: (game: GameType) => void }) {
  const games = [
    { id: 'bull-quest' as GameType, name: 'Bull Quest', icon: Sword, desc: 'Navigate obstacles & collect treasures', color: '#FF6B35' },
    { id: 'battle-arena' as GameType, name: 'Battle Arena', icon: Shield, desc: 'Turn-based combat vs enemy bulls', color: '#E63946' },
    { id: 'treasure-hunt' as GameType, name: 'Treasure Hunt', icon: Key, desc: 'Explore & dig for hidden keys', color: '#2ECC71' },
    { id: 'key-slots' as GameType, name: 'Key Slots', icon: Coins, desc: 'Match 3 keys to win big!', color: '#9B59B6' },
    { id: 'bull-dice' as GameType, name: 'Bull Dice', icon: Dice1, desc: 'Roll high to earn keys!', color: '#3498DB' },
    { id: 'speed-keys' as GameType, name: 'Speed Keys', icon: Timer, desc: 'Collect keys before time runs out!', color: '#F39C12' },
    { id: 'key-match' as GameType, name: 'Key Match', icon: Gem, desc: 'Memory matching for keys!', color: '#1ABC9C' },
    { id: 'bull-gauntlet' as GameType, name: 'Bull Gauntlet', icon: Target, desc: 'Survive 10 challenges for keys!', color: '#E74C3C' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6 p-4 bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/10 rounded-xl border border-[#FFD700]/30">
        <Key className="w-8 h-8 text-[#FFD700] mx-auto mb-2" />
        <p className="text-[#FFD700] font-semibold">Earn Keys 🔑 in these RPG games!</p>
        <p className="text-gray-400 text-sm">Use keys to unlock premium content</p>
      </div>
      
      {games.map(game => (
        <Card 
          key={game.id}
          className="p-4 bg-[#0d2137] border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ borderColor: game.color + '50' }}
          onClick={() => onSelectGame(game.id)}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: game.color + '20' }}
            >
              <game.icon className="w-7 h-7" style={{ color: game.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{game.name}</h3>
              <p className="text-sm text-gray-400">{game.desc}</p>
            </div>
            <Key className="w-5 h-5 text-[#FFD700]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Game 1: Bull Quest - Navigate through obstacles and collect treasures
function BullQuestGame({ onWin }: { onWin: (keys: number) => void }) {
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [treasures, setTreasures] = useState<{x: number; y: number; collected: boolean}[]>([]);
  const [obstacles, setObstacles] = useState<{x: number; y: number}[]>([]);
  const [enemies, setEnemies] = useState<{x: number; y: number}[]>([]);
  const [hp, setHp] = useState(3);
  const [keysCollected, setKeysCollected] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const gridSize = 6;

  // Check if a path exists from player to target using BFS
  const hasPath = (start: {x: number; y: number}, target: {x: number; y: number}, blockedCells: {x: number; y: number}[]) => {
    const visited = new Set<string>();
    const queue = [start];
    visited.add(`${start.x},${start.y}`);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === target.x && current.y === target.y) return true;
      
      const dirs = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}];
      for (const dir of dirs) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const key = `${nx},${ny}`;
        
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && 
            !visited.has(key) && !blockedCells.some(b => b.x === nx && b.y === ny)) {
          visited.add(key);
          queue.push({x: nx, y: ny});
        }
      }
    }
    return false;
  };

  const initLevel = useCallback(() => {
    setPlayerPos({ x: 0, y: 0 });
    setHp(3);
    setGameOver(false);
    
    // Generate treasures (keys)
    const newTreasures: {x: number; y: number; collected: boolean}[] = [];
    for (let i = 0; i < 3 + level; i++) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
      } while ((pos.x === 0 && pos.y === 0) || newTreasures.some(t => t.x === pos.x && t.y === pos.y));
      newTreasures.push({ ...pos, collected: false });
    }
    setTreasures(newTreasures);
    
    // Generate obstacles with path validation - fewer obstacles to prevent trapping
    const maxObstacles = Math.min(3 + Math.floor(level / 2), 6); // Cap obstacles
    const newObstacles: {x: number; y: number}[] = [];
    let attempts = 0;
    
    while (newObstacles.length < maxObstacles && attempts < 50) {
      attempts++;
      const pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
      
      // Skip if on player, treasure, or existing obstacle
      if ((pos.x === 0 && pos.y === 0) || 
          newTreasures.some(t => t.x === pos.x && t.y === pos.y) ||
          newObstacles.some(o => o.x === pos.x && o.y === pos.y)) {
        continue;
      }
      
      // Skip cells adjacent to player start to ensure movement
      if ((pos.x === 0 && pos.y === 1) || (pos.x === 1 && pos.y === 0)) {
        continue;
      }
      
      // Check if adding this obstacle still allows paths to all treasures
      const testObstacles = [...newObstacles, pos];
      const allReachable = newTreasures.every(t => hasPath({x: 0, y: 0}, {x: t.x, y: t.y}, testObstacles));
      
      if (allReachable) {
        newObstacles.push(pos);
      }
    }
    setObstacles(newObstacles);
    
    // Generate enemies (fewer to reduce difficulty)
    const newEnemies: {x: number; y: number}[] = [];
    for (let i = 0; i < Math.min(Math.floor(level / 2), 2); i++) {
      let pos;
      let enemyAttempts = 0;
      do {
        pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        enemyAttempts++;
      } while (
        enemyAttempts < 20 && (
        (pos.x === 0 && pos.y === 0) || 
        (pos.x <= 1 && pos.y <= 1) || // Keep enemies away from start
        newTreasures.some(t => t.x === pos.x && t.y === pos.y) ||
        newObstacles.some(o => o.x === pos.x && o.y === pos.y) ||
        newEnemies.some(e => e.x === pos.x && e.y === pos.y))
      );
      if (enemyAttempts < 20) {
        newEnemies.push(pos);
      }
    }
    setEnemies(newEnemies);
  }, [level]);

  useEffect(() => {
    initLevel();
  }, [level, initLevel]);

  const move = (dx: number, dy: number) => {
    if (gameOver) return;
    
    const newX = Math.max(0, Math.min(gridSize - 1, playerPos.x + dx));
    const newY = Math.max(0, Math.min(gridSize - 1, playerPos.y + dy));
    
    // Check obstacle collision
    if (obstacles.some(o => o.x === newX && o.y === newY)) {
      playSound('hit');
      vibrate(100);
      return;
    }
    
    setPlayerPos({ x: newX, y: newY });
    playSound('click');
    vibrate(20);
    
    // Check treasure collection
    const treasureIndex = treasures.findIndex(t => t.x === newX && t.y === newY && !t.collected);
    if (treasureIndex !== -1) {
      playSound('collect');
      vibrate([50, 30, 50]);
      setTreasures(prev => prev.map((t, i) => i === treasureIndex ? { ...t, collected: true } : t));
      setKeysCollected(prev => prev + 1);
      
      // Check level complete
      const remaining = treasures.filter((t, i) => i !== treasureIndex && !t.collected).length;
      if (remaining === 0) {
        playSound('win');
        vibrate([100, 50, 100, 50, 200]);
        setTimeout(() => setLevel(prev => prev + 1), 500);
      }
    }
    
    // Check enemy collision
    if (enemies.some(e => e.x === newX && e.y === newY)) {
      playSound('lose');
      vibrate([200, 100, 200]);
      const newHp = hp - 1;
      setHp(newHp);
      
      if (newHp <= 0) {
        setGameOver(true);
        // Award all collected keys when game ends
        const totalKeys = keysCollected + (treasureIndex !== -1 ? 1 : 0);
        if (totalKeys > 0) {
          // Use setTimeout to ensure state updates complete first
          setTimeout(() => {
            onWin(totalKeys);
          }, 100);
        }
      }
    }
  };

  const getCellContent = (x: number, y: number) => {
    if (playerPos.x === x && playerPos.y === y) return '🐂';
    if (treasures.some(t => t.x === x && t.y === y && !t.collected)) return '🔑';
    if (obstacles.some(o => o.x === x && o.y === y)) return '🪨';
    if (enemies.some(e => e.x === x && e.y === y)) return '👹';
    return '';
  };

  return (
    <Card className="p-4 bg-[#0d2137] border-[#FF6B35]/30">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-5 h-5 ${i < hp ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
          ))}
        </div>
        <span className="text-[#FFD700] font-bold">Level {level}</span>
        <span className="text-white font-bold">🔑 {keysCollected}</span>
      </div>
      
      {/* Game Grid */}
      <div className="grid gap-1 mb-4 mx-auto" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, maxWidth: '300px' }}>
        {[...Array(gridSize)].map((_, y) =>
          [...Array(gridSize)].map((_, x) => (
            <div 
              key={`${x}-${y}`}
              className={`aspect-square rounded flex items-center justify-center text-xl
                ${playerPos.x === x && playerPos.y === y ? 'bg-[#FF6B35]/40' : 'bg-[#0a1628]'}
                border border-[#FF6B35]/20`}
            >
              {getCellContent(x, y)}
            </div>
          ))
        )}
      </div>
      
      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
        <div />
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#FF6B35]/80" onClick={() => move(0, -1)}>↑</Button>
        <div />
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#FF6B35]/80" onClick={() => move(-1, 0)}>←</Button>
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#FF6B35]/80" onClick={() => move(0, 1)}>↓</Button>
        <Button size="sm" className="bg-[#FF6B35] hover:bg-[#FF6B35]/80" onClick={() => move(1, 0)}>→</Button>
      </div>
      
      {gameOver && (
        <div className="mt-4 text-center">
          <p className="text-xl text-red-400 mb-2">Game Over!</p>
          <p className="text-[#FFD700]">Earned {keysCollected} 🔑</p>
          <Button className="mt-2 bg-[#FF6B35]" onClick={() => { setLevel(1); setKeysCollected(0); initLevel(); }}>
            Play Again
          </Button>
        </div>
      )}
    </Card>
  );
}

// Game 2: Battle Arena - Turn-based combat
function BattleArenaGame({ onWin }: { onWin: (keys: number) => void }) {
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [message, setMessage] = useState('Choose your action!');
  const [wins, setWins] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [playerPower, setPlayerPower] = useState(0);
  const [shield, setShield] = useState(0);

  const resetBattle = (keepWins = false) => {
    setPlayerHp(100);
    setEnemyHp(100);
    setPlayerTurn(true);
    setMessage('A wild enemy bull appears! Choose your action!');
    setPlayerPower(0);
    setShield(0);
    if (!keepWins) setWins(0);
  };

  useEffect(() => {
    resetBattle();
  }, []);

  const playerAction = (action: 'attack' | 'power' | 'defend') => {
    if (!playerTurn || isAnimating || enemyHp <= 0 || playerHp <= 0) return;
    
    setIsAnimating(true);
    playSound('click');
    vibrate(30);
    
    let damage = 0;
    
    switch(action) {
      case 'attack':
        damage = 15 + Math.floor(Math.random() * 15) + playerPower;
        playSound('hit');
        vibrate([50, 30, 100]);
        setMessage(`You charge and deal ${damage} damage!`);
        setEnemyHp(prev => Math.max(0, prev - damage));
        setPlayerPower(0);
        break;
      case 'power':
        const powerGain = 10 + Math.floor(Math.random() * 10);
        playSound('power');
        vibrate([30, 20, 30, 20, 50]);
        setPlayerPower(prev => prev + powerGain);
        setMessage(`You charge power! +${powerGain} to next attack!`);
        break;
      case 'defend':
        const shieldAmount = 20 + Math.floor(Math.random() * 15);
        playSound('power');
        vibrate(100);
        setShield(shieldAmount);
        setMessage(`You raise your shield! Block ${shieldAmount} damage!`);
        break;
    }
    
    setTimeout(async () => {
      setPlayerTurn(false);
      setIsAnimating(false);
      
      // Check if enemy defeated
      if (enemyHp - damage <= 0) {
        playSound('win');
        vibrate([100, 50, 100, 50, 200]);
        const newWins = wins + 1;
        setWins(newWins);
        setMessage(`Victory! You've won ${newWins} battle${newWins > 1 ? 's' : ''}!`);
        
        // Award 1 key for every 3 wins
        if (newWins >= 3 && newWins % 3 === 0) {
          await onWin(1);
          setMessage(`Champion! You earned 1 🔑!`);
        }
      } else {
        // Enemy turn
        setTimeout(() => enemyTurn(), 800);
      }
    }, 500);
  };

  const enemyTurn = () => {
    if (playerHp <= 0) return;
    
    const baseDamage = 10 + Math.floor(Math.random() * 20);
    const actualDamage = Math.max(0, baseDamage - shield);
    
    playSound('hit');
    vibrate([100, 50, 100]);
    
    if (shield > 0) {
      setMessage(`Enemy attacks for ${baseDamage}! Shield blocks ${Math.min(shield, baseDamage)}! You take ${actualDamage} damage!`);
    } else {
      setMessage(`Enemy charges and deals ${actualDamage} damage!`);
    }
    
    setPlayerHp(prev => Math.max(0, prev - actualDamage));
    setShield(0);
    
    setTimeout(async () => {
      if (playerHp - actualDamage <= 0) {
        playSound('lose');
        vibrate([200, 100, 200, 100, 200]);
        const keysEarned = Math.floor(wins / 3);
        setMessage(`Defeated! You won ${wins} battles. ${keysEarned > 0 ? `Earned ${keysEarned} 🔑` : ''}`);
        // Award keys for completed sets of 3 wins
        if (keysEarned > 0) {
          await onWin(keysEarned);
        }
      } else {
        setPlayerTurn(true);
      }
    }, 500);
  };

  const healthBarColor = (hp: number) => {
    if (hp > 60) return 'bg-green-500';
    if (hp > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="p-4 bg-[#0d2137] border-[#E63946]/30">
      <div className="text-center mb-4">
        <p className="text-gray-300 text-sm">Win 3 battles = 1 🔑</p>
        <p className="text-[#FFD700] font-bold">Wins: {wins}/3</p>
      </div>
      
      {/* Battle Scene */}
      <div className="flex justify-between items-center mb-6">
        {/* Player */}
        <div className="text-center flex-1">
          <div className="text-4xl mb-2 animate-pulse">🐂</div>
          <p className="text-sm text-gray-400">You</p>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div className={`h-full transition-all ${healthBarColor(playerHp)}`} style={{ width: `${playerHp}%` }} />
          </div>
          <p className="text-xs text-white mt-1">{playerHp}/100</p>
          {playerPower > 0 && <p className="text-xs text-[#FFD700]">⚡ +{playerPower}</p>}
          {shield > 0 && <p className="text-xs text-blue-400">🛡️ {shield}</p>}
        </div>
        
        <div className="text-2xl mx-4">⚔️</div>
        
        {/* Enemy */}
        <div className="text-center flex-1">
          <div className={`text-4xl mb-2 ${!playerTurn && !isAnimating ? 'animate-bounce' : ''}`}>👹</div>
          <p className="text-sm text-gray-400">Enemy Bull</p>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mt-1">
            <div className={`h-full transition-all ${healthBarColor(enemyHp)}`} style={{ width: `${enemyHp}%` }} />
          </div>
          <p className="text-xs text-white mt-1">{enemyHp}/100</p>
        </div>
      </div>
      
      {/* Message */}
      <div className="bg-[#0a1628] rounded-lg p-3 mb-4 min-h-[60px] flex items-center justify-center">
        <p className="text-center text-gray-200">{message}</p>
      </div>
      
      {/* Actions */}
      {playerHp > 0 && enemyHp > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <Button 
            onClick={() => playerAction('attack')}
            disabled={!playerTurn || isAnimating}
            className="bg-[#E63946] hover:bg-[#E63946]/80 flex flex-col items-center py-4"
          >
            <Sword className="w-5 h-5 mb-1" />
            <span className="text-xs">Attack</span>
          </Button>
          <Button 
            onClick={() => playerAction('power')}
            disabled={!playerTurn || isAnimating}
            className="bg-[#FFD700] hover:bg-[#FFD700]/80 text-black flex flex-col items-center py-4"
          >
            <Flame className="w-5 h-5 mb-1" />
            <span className="text-xs">Power</span>
          </Button>
          <Button 
            onClick={() => playerAction('defend')}
            disabled={!playerTurn || isAnimating}
            className="bg-blue-500 hover:bg-blue-500/80 flex flex-col items-center py-4"
          >
            <Shield className="w-5 h-5 mb-1" />
            <span className="text-xs">Defend</span>
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <Button 
            onClick={() => resetBattle(enemyHp <= 0 && wins < 3)}
            className="bg-[#E63946] hover:bg-[#E63946]/80"
          >
            {enemyHp <= 0 && wins < 3 ? 'Next Battle' : 'Play Again'}
          </Button>
        </div>
      )}
    </Card>
  );
}

// Game 3: Treasure Hunt - Explore and dig for keys
function TreasureHuntGame({ onWin }: { onWin: (keys: number) => void }) {
  const gridSize = 5;
  const [grid, setGrid] = useState<('hidden' | 'empty' | 'key' | 'trap' | 'bonus')[][]>([]);
  const [digsLeft, setDigsLeft] = useState(8);
  const [keysFound, setKeysFound] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hasAwardedKeys, setHasAwardedKeys] = useState(false);

  const initGame = () => {
    const newGrid: ('hidden' | 'empty' | 'key' | 'trap' | 'bonus')[][] = 
      Array(gridSize).fill(null).map(() => Array(gridSize).fill('hidden'));
    
    // Place 2 keys
    let keysPlaced = 0;
    while (keysPlaced < 2) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if (newGrid[y][x] === 'hidden') {
        newGrid[y][x] = 'key';
        keysPlaced++;
      }
    }
    
    // Place 3 traps
    let trapsPlaced = 0;
    while (trapsPlaced < 3) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if (newGrid[y][x] === 'hidden') {
        newGrid[y][x] = 'trap';
        trapsPlaced++;
      }
    }
    
    // Place 1 bonus
    let bonusPlaced = false;
    while (!bonusPlaced) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if (newGrid[y][x] === 'hidden') {
        newGrid[y][x] = 'bonus';
        bonusPlaced = true;
      }
    }
    
    // Mark remaining as empty (but still show as hidden)
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (newGrid[y][x] === 'hidden') {
          newGrid[y][x] = 'empty';
        }
      }
    }
    
    // Reset all to hidden for display
    const hiddenGrid: ('hidden' | 'empty' | 'key' | 'trap' | 'bonus')[][] = 
      Array(gridSize).fill(null).map(() => Array(gridSize).fill('hidden'));
    
    setGrid(hiddenGrid);
    setDigsLeft(8);
    setKeysFound(0);
    setGameOver(false);
    setHintsUsed(0);
    setHasAwardedKeys(false);
    
    // Store actual values
    (window as any).__treasureGrid = newGrid;
  };

  useEffect(() => {
    initGame();
  }, []);

  const dig = (x: number, y: number) => {
    if (gameOver || digsLeft <= 0) return;
    if (grid[y][x] !== 'hidden') return;
    
    playSound('click');
    vibrate(30);
    
    const actualGrid = (window as any).__treasureGrid;
    const cellValue = actualGrid[y][x];
    
    setGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      newGrid[y][x] = cellValue;
      return newGrid;
    });
    
    setDigsLeft(prev => prev - 1);
    
    switch (cellValue) {
      case 'key':
        playSound('collect');
        vibrate([50, 30, 50, 30, 100]);
        const newFound = keysFound + 1;
        setKeysFound(newFound);
        
        // Win condition: found both keys
        if (newFound >= 2 && !hasAwardedKeys) {
          setGameOver(true);
          setHasAwardedKeys(true);
          // Award 1 key for finding both treasures
          setTimeout(async () => {
            await onWin(1);
          }, 100);
        }
        break;
      case 'trap':
        playSound('lose');
        vibrate([200, 100, 200]);
        setDigsLeft(prev => Math.max(0, prev - 2));
        break;
      case 'bonus':
        playSound('win');
        vibrate([100, 50, 100]);
        setDigsLeft(prev => prev + 3);
        break;
      default:
        playSound('hit');
    }
    
    // Check game over when out of digs
    const newDigsLeft = cellValue === 'trap' ? digsLeft - 3 : digsLeft - 1;
    const currentKeysFound = cellValue === 'key' ? keysFound + 1 : keysFound;
    
    if (newDigsLeft <= 0 && currentKeysFound < 2 && !hasAwardedKeys) {
      setGameOver(true);
      // Award 1 key if found at least 1 treasure key during the game
      if (currentKeysFound >= 1) {
        setHasAwardedKeys(true);
        setTimeout(async () => {
          await onWin(1);
        }, 100);
      }
    }
  };

  const getCellDisplay = (x: number, y: number) => {
    const cell = grid[y][x];
    switch (cell) {
      case 'hidden': return '❓';
      case 'key': return '🔑';
      case 'trap': return '💀';
      case 'bonus': return '⭐';
      case 'empty': return '🕳️';
      default: return '❓';
    }
  };

  const getCellStyle = (x: number, y: number) => {
    const cell = grid[y][x];
    switch (cell) {
      case 'key': return 'bg-[#FFD700]/30 border-[#FFD700]';
      case 'trap': return 'bg-red-500/30 border-red-500';
      case 'bonus': return 'bg-purple-500/30 border-purple-500';
      case 'empty': return 'bg-gray-600/30 border-gray-600';
      default: return 'bg-[#0a1628] border-[#2ECC71]/30 hover:border-[#2ECC71] hover:bg-[#2ECC71]/10';
    }
  };

  return (
    <Card className="p-4 bg-[#0d2137] border-[#2ECC71]/30">
      <div className="flex justify-between items-center mb-4">
        <div className="text-white">
          <span className="text-sm">Digs Left:</span>
          <span className="font-bold ml-2 text-[#2ECC71]">{digsLeft}</span>
        </div>
        <div className="text-[#FFD700] font-bold">
          🔑 {keysFound}/2
        </div>
      </div>
      
      <div className="mb-4 text-center">
        <p className="text-gray-400 text-sm">Find 2 keys to win! Avoid traps 💀</p>
      </div>
      
      {/* Dig Grid */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
        {grid.map((row, y) =>
          row.map((_, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => dig(x, y)}
              disabled={gameOver || grid[y][x] !== 'hidden'}
              className={`aspect-square rounded-lg text-2xl flex items-center justify-center border-2 transition-all
                ${getCellStyle(x, y)}
                ${grid[y][x] === 'hidden' ? 'active:scale-95 cursor-pointer' : 'cursor-default'}`}
            >
              {getCellDisplay(x, y)}
            </button>
          ))
        )}
      </div>
      
      <div className="text-center text-xs text-gray-500 mb-4">
        <span className="mx-2">🔑 Key</span>
        <span className="mx-2">💀 Trap (-2 digs)</span>
        <span className="mx-2">⭐ Bonus (+3 digs)</span>
      </div>
      
      {gameOver && (
        <div className="text-center">
          <p className={`text-xl mb-2 ${keysFound >= 2 ? 'text-[#2ECC71]' : 'text-red-400'}`}>
            {keysFound >= 2 ? '🎉 You found all keys!' : 'Game Over!'}
          </p>
          {keysFound > 0 && <p className="text-[#FFD700]">Earned {keysFound >= 2 ? 1 : 0} 🔑</p>}
          <Button onClick={initGame} className="mt-2 bg-[#2ECC71] hover:bg-[#2ECC71]/80">
            Play Again
          </Button>
        </div>
      )}
    </Card>
  );
}

// Game 4: Key Slots - Match 3 keys to win
function KeySlotsGame({ onWin }: { onWin: (keys: number) => void }) {
  const [reels, setReels] = useState(['🔑', '🐂', '💎']);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const symbols = ['🔑', '🐂', '💎', '⭐', '🎰'];

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    playSound('click');
    vibrate(50);

    let spins = 0;
    const maxSpins = 15;
    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
      spins++;
      if (spins >= maxSpins) {
        clearInterval(interval);
        const finalReels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        setReels(finalReels);
        setSpinning(false);

        if (finalReels[0] === '🔑' && finalReels[1] === '🔑' && finalReels[2] === '🔑') {
          playSound('win');
          vibrate([100, 50, 100, 50, 200]);
          setResult('JACKPOT! 3 Keys!');
          onWin(3);
        } else if (finalReels.filter(s => s === '🔑').length === 2) {
          playSound('collect');
          vibrate([50, 30, 50]);
          setResult('Nice! 2 Keys!');
          onWin(1);
        } else if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
          playSound('collect');
          vibrate(100);
          setResult('Triple Match! +1 Key');
          onWin(1);
        } else {
          playSound('lose');
          vibrate(100);
          setResult('Try again!');
        }
      }
    }, 100);
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#9B59B6]/50">
      <h2 className="text-xl font-bold text-[#9B59B6] mb-4 text-center">🎰 Key Slots</h2>
      <div className="flex justify-center gap-4 mb-6">
        {reels.map((symbol, i) => (
          <div
            key={i}
            className={`w-20 h-20 bg-[#1a3a5c] rounded-xl flex items-center justify-center text-4xl border-2 border-[#9B59B6]/50 ${
              spinning ? 'animate-pulse' : ''
            }`}
          >
            {symbol}
          </div>
        ))}
      </div>
      {result && (
        <p className={`text-center mb-4 text-lg font-bold ${result.includes('JACKPOT') ? 'text-[#FFD700] animate-pulse' : result.includes('Try') ? 'text-red-400' : 'text-[#9B59B6]'}`}>
          {result}
        </p>
      )}
      <Button onClick={spin} disabled={spinning} className="w-full bg-[#9B59B6] hover:bg-[#9B59B6]/80">
        {spinning ? 'Spinning...' : 'Spin! 🎰'}
      </Button>
    </Card>
  );
}

// Game 5: Bull Dice - Roll high to win keys
function BullDiceGame({ onWin }: { onWin: (keys: number) => void }) {
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    playSound('click');
    vibrate(50);

    let rolls = 0;
    const interval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      rolls++;
      if (rolls >= 10) {
        clearInterval(interval);
        const finalDice = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ];
        setDice(finalDice);
        setRolling(false);

        const total = finalDice[0] + finalDice[1];
        if (finalDice[0] === finalDice[1]) {
          playSound('win');
          vibrate([100, 50, 100, 50, 200]);
          setResult(`Double ${finalDice[0]}s! +2 Keys!`);
          setStreak(s => s + 1);
          onWin(2);
        } else if (total >= 10) {
          playSound('collect');
          vibrate([50, 30, 50]);
          setResult(`High roll (${total})! +1 Key`);
          setStreak(s => s + 1);
          onWin(1);
        } else {
          playSound('lose');
          vibrate(100);
          setResult(`Rolled ${total}. Need 10+`);
          setStreak(0);
        }
      }
    }, 80);
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#3498DB]/50">
      <h2 className="text-xl font-bold text-[#3498DB] mb-4 text-center">🎲 Bull Dice</h2>
      <div className="flex justify-center gap-6 mb-4">
        {dice.map((d, i) => (
          <div
            key={i}
            className={`w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl font-bold text-[#0d2137] ${
              rolling ? 'animate-bounce' : ''
            }`}
          >
            {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][d - 1]}
          </div>
        ))}
      </div>
      {streak > 0 && <p className="text-center text-[#FFD700] mb-2">🔥 Streak: {streak}</p>}
      {result && (
        <p className={`text-center mb-4 font-bold ${result.includes('Double') || result.includes('High') ? 'text-[#3498DB]' : 'text-red-400'}`}>
          {result}
        </p>
      )}
      <Button onClick={roll} disabled={rolling} className="w-full bg-[#3498DB] hover:bg-[#3498DB]/80">
        {rolling ? 'Rolling...' : 'Roll Dice! 🎲'}
      </Button>
    </Card>
  );
}

// Game 6: Speed Keys - Tap targets before time runs out
function SpeedKeysGame({ onWin }: { onWin: (keys: number) => void }) {
  const [targets, setTargets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(15);
    setGameActive(true);
    setGameOver(false);
    setTargets([]);
    playSound('click');
  }, []);

  useEffect(() => {
    if (!gameActive) return;

    const spawnInterval = setInterval(() => {
      setTargets(prev => [
        ...prev.slice(-4),
        { id: Date.now(), x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 },
      ]);
    }, 600);

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(spawnInterval);
          clearInterval(timer);
          setGameActive(false);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(timer);
    };
  }, [gameActive]);

  useEffect(() => {
    if (gameOver && score >= 5) {
      const keysEarned = Math.floor(score / 5);
      playSound('win');
      vibrate([100, 50, 100, 50, 200]);
      onWin(keysEarned);
    } else if (gameOver) {
      playSound('lose');
    }
  }, [gameOver, score, onWin]);

  const hitTarget = (id: number) => {
    playSound('collect');
    vibrate(30);
    setTargets(prev => prev.filter(t => t.id !== id));
    setScore(s => s + 1);
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#F39C12]/50">
      <h2 className="text-xl font-bold text-[#F39C12] mb-4 text-center">⚡ Speed Keys</h2>
      <div className="flex justify-between mb-4">
        <span className="text-white">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-[#F39C12]'}`}>
          ⏱️ {timeLeft}s
        </span>
      </div>
      <div className="relative h-48 bg-[#1a3a5c] rounded-xl mb-4 overflow-hidden">
        {targets.map(t => (
          <button
            key={t.id}
            onClick={() => hitTarget(t.id)}
            className="absolute w-12 h-12 bg-[#F39C12] rounded-full flex items-center justify-center text-2xl hover:scale-110 transition-transform animate-pulse"
            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            🔑
          </button>
        ))}
        {!gameActive && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">Tap keys as fast as you can!</p>
          </div>
        )}
      </div>
      {gameOver && (
        <p className={`text-center mb-4 font-bold ${score >= 5 ? 'text-[#F39C12]' : 'text-red-400'}`}>
          {score >= 5 ? `🎉 Earned ${Math.floor(score / 5)} Key(s)!` : 'Need 5+ hits for a key!'}
        </p>
      )}
      <Button onClick={startGame} disabled={gameActive} className="w-full bg-[#F39C12] hover:bg-[#F39C12]/80">
        {gameActive ? `Playing... (${score})` : 'Start Game!'}
      </Button>
    </Card>
  );
}

// Game 7: Key Match - Memory matching
function KeyMatchGame({ onWin }: { onWin: (keys: number) => void }) {
  const symbols = ['🔑', '🐂', '💎', '👑', '⭐', '🎯'];
  const [cards, setCards] = useState<{ id: number; symbol: string; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = useCallback(() => {
    const pairs = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }));
    setCards(pairs);
    setFlipped([]);
    setMatches(0);
    setMoves(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const flipCard = (id: number) => {
    if (flipped.length === 2 || cards[id].flipped || cards[id].matched) return;
    
    playSound('click');
    vibrate(20);
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].symbol === cards[second].symbol) {
        playSound('collect');
        vibrate([50, 30, 50]);
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second ? { ...c, matched: true } : c
          ));
          setMatches(m => m + 1);
          setFlipped([]);
          
          if (matches + 1 === symbols.length) {
            setGameOver(true);
            const keysEarned = moves <= 12 ? 3 : moves <= 18 ? 2 : 1;
            playSound('win');
            vibrate([100, 50, 100, 50, 200]);
            onWin(keysEarned);
          }
        }, 300);
      } else {
        playSound('hit');
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
        }, 800);
      }
    }
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#1ABC9C]/50">
      <h2 className="text-xl font-bold text-[#1ABC9C] mb-4 text-center">🧠 Key Match</h2>
      <p className="text-center text-gray-400 mb-4">Moves: {moves} | Matches: {matches}/{symbols.length}</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => flipCard(card.id)}
            className={`aspect-square rounded-lg flex items-center justify-center text-2xl transition-all ${
              card.flipped || card.matched
                ? 'bg-[#1ABC9C]/30 border-[#1ABC9C]'
                : 'bg-[#1a3a5c] hover:bg-[#1a3a5c]/80 border-gray-600'
            } border-2`}
          >
            {card.flipped || card.matched ? card.symbol : '❓'}
          </button>
        ))}
      </div>
      {gameOver && (
        <div className="text-center mb-4">
          <p className="text-[#1ABC9C] font-bold">🎉 All matched in {moves} moves!</p>
          <p className="text-[#FFD700]">Earned {moves <= 12 ? 3 : moves <= 18 ? 2 : 1} 🔑</p>
        </div>
      )}
      <Button onClick={initGame} className="w-full bg-[#1ABC9C] hover:bg-[#1ABC9C]/80">
        {gameOver ? 'Play Again' : 'Restart'}
      </Button>
    </Card>
  );
}

// Game 8: Bull Gauntlet - Survive 10 challenges
function BullGauntletGame({ onWin }: { onWin: (keys: number) => void }) {
  const [round, setRound] = useState(1);
  const [hp, setHp] = useState(3);
  const [challenge, setChallenge] = useState<{ type: string; answer: number; options: number[] } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const generateChallenge = useCallback(() => {
    const types = ['add', 'sub', 'mult'];
    const type = types[Math.floor(Math.random() * types.length)];
    let a: number, b: number, answer: number;
    
    if (type === 'add') {
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * 20) + 5;
      answer = a + b;
    } else if (type === 'sub') {
      a = Math.floor(Math.random() * 30) + 20;
      b = Math.floor(Math.random() * 15) + 5;
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 10) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      answer = a * b;
    }
    
    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 20) - 10);
      if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }
    
    return {
      type: type === 'add' ? `${a} + ${b} = ?` : type === 'sub' ? `${a} - ${b} = ?` : `${a} × ${b} = ?`,
      answer,
      options: options.sort(() => Math.random() - 0.5),
    };
  }, []);

  const startGame = useCallback(() => {
    setRound(1);
    setHp(3);
    setGameOver(false);
    setResult(null);
    setChallenge(generateChallenge());
  }, [generateChallenge]);

  useEffect(() => {
    startGame();
  }, []);

  const selectAnswer = (selected: number) => {
    if (!challenge || gameOver) return;
    
    if (selected === challenge.answer) {
      playSound('collect');
      vibrate([50, 30, 50]);
      setResult('Correct!');
      
      if (round >= 10) {
        setGameOver(true);
        playSound('win');
        vibrate([100, 50, 100, 50, 200]);
        const keysEarned = hp === 3 ? 3 : hp === 2 ? 2 : 1;
        onWin(keysEarned);
      } else {
        setTimeout(() => {
          setRound(r => r + 1);
          setChallenge(generateChallenge());
          setResult(null);
        }, 500);
      }
    } else {
      playSound('hit');
      vibrate(200);
      setResult('Wrong!');
      const newHp = hp - 1;
      setHp(newHp);
      
      if (newHp <= 0) {
        setGameOver(true);
        playSound('lose');
      } else {
        setTimeout(() => {
          setChallenge(generateChallenge());
          setResult(null);
        }, 800);
      }
    }
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#E74C3C]/50">
      <h2 className="text-xl font-bold text-[#E74C3C] mb-4 text-center">⚔️ Bull Gauntlet</h2>
      <div className="flex justify-between mb-4">
        <span className="text-white">Round: {round}/10</span>
        <span className="text-red-400">
          {'❤️'.repeat(hp)}{'🖤'.repeat(3 - hp)}
        </span>
      </div>
      
      {challenge && !gameOver && (
        <>
          <div className="text-center mb-6">
            <p className="text-2xl font-bold text-white">{challenge.type}</p>
          </div>
          {result && (
            <p className={`text-center mb-4 font-bold ${result === 'Correct!' ? 'text-[#2ECC71]' : 'text-red-400'}`}>
              {result}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {challenge.options.map((opt, i) => (
              <Button
                key={i}
                onClick={() => selectAnswer(opt)}
                className="h-12 text-lg bg-[#1a3a5c] hover:bg-[#E74C3C] border border-[#E74C3C]/50"
              >
                {opt}
              </Button>
            ))}
          </div>
        </>
      )}
      
      {gameOver && (
        <div className="text-center">
          <p className={`text-xl mb-2 ${hp > 0 ? 'text-[#2ECC71]' : 'text-red-400'}`}>
            {hp > 0 ? '🎉 Gauntlet Complete!' : 'Defeated!'}
          </p>
          {hp > 0 && <p className="text-[#FFD700]">Earned {hp === 3 ? 3 : hp === 2 ? 2 : 1} 🔑</p>}
          <Button onClick={startGame} className="mt-4 bg-[#E74C3C] hover:bg-[#E74C3C]/80">
            Play Again
          </Button>
        </div>
      )}
    </Card>
  );
}
