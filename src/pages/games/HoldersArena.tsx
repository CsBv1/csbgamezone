import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crown, Users, Trophy, Gem, Timer, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { CreditBar } from "@/components/CreditBar";

interface Player {
  id: string;
  user_id: string;
  x: number;
  y: number;
  username: string | null;
  score: number;
  color: string;
}

// Arena maps - exclusive designs
const ARENA_MAPS = [
  { id: 'golden-palace', name: 'Golden Palace', color: '#FFD700', bg: '#1a1a0f' },
  { id: 'diamond-vault', name: 'Diamond Vault', color: '#00D4FF', bg: '#0a1a2a' },
  { id: 'legendary-pit', name: 'Legendary Pit', color: '#FF6B35', bg: '#1a0f0a' },
];

const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 700;
const PLAYER_SIZE = 40;
const MOVE_SPEED = 8;

export default function HoldersArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPosition, setMyPosition] = useState({ x: 600, y: 350 });
  const [myColor, setMyColor] = useState('#FFD700');
  const [score, setScore] = useState(0);
  const [gems, setGems] = useState<{id: string; x: number; y: number; value: number}[]>([]);
  const [currentMap, setCurrentMap] = useState(ARENA_MAPS[0]);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minute rounds
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const keysPressed = useRef<Set<string>>(new Set());
  
  // NFT check
  const { bullsOwned } = useNFTBonuses(walletAddress);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", variant: "destructive" });
        navigate('/games/bull-world');
        return;
      }
      
      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, wallet_address')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUsername((profile as any).username || 'Player');
        if ((profile as any).wallet_address) {
          setWalletAddress((profile as any).wallet_address);
        }
      }
      
      // Check NFT ownership from cache
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
      
      setIsLoading(false);
      spawnGems();
    };
    
    init();
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const spawnGems = () => {
    const newGems = [];
    for (let i = 0; i < 20; i++) {
      newGems.push({
        id: `gem-${i}-${Date.now()}`,
        x: 100 + Math.random() * (ARENA_WIDTH - 200),
        y: 100 + Math.random() * (ARENA_HEIGHT - 200),
        value: Math.random() > 0.7 ? 10 : Math.random() > 0.5 ? 5 : 1
      });
    }
    setGems(newGems);
  };

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(180);
    spawnGems();
  };

  // Timer
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  const endGame = async () => {
    setIsPlaying(false);
    toast({ 
      title: "🏆 Round Complete!", 
      description: `You collected ${score} gems!` 
    });
    
    // Award diamonds
    if (userId && score > 0) {
      const diamondReward = Math.floor(score / 2);
      const { data: current } = await supabase
        .from('user_diamonds')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      
      if (current) {
        await supabase
          .from('user_diamonds')
          .update({ 
            balance: ((current as any).balance || 0) + diamondReward,
            total_earned: ((current as any).total_earned || 0) + diamondReward
          })
          .eq('user_id', userId);
        
        toast({ title: `+${diamondReward} 💎`, description: "Diamonds added to your balance!" });
      }
    }
  };

  // Movement controls
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key.toLowerCase());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = setInterval(() => {
      let dx = 0, dy = 0;

      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) dy = -MOVE_SPEED;
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) dy = MOVE_SPEED;
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) dx = -MOVE_SPEED;
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) dx = MOVE_SPEED;

      if (dx !== 0 || dy !== 0) {
        setMyPosition(prev => ({
          x: Math.max(40, Math.min(ARENA_WIDTH - 40, prev.x + dx)),
          y: Math.max(40, Math.min(ARENA_HEIGHT - 40, prev.y + dy))
        }));
      }

      // Check gem collection
      setGems(prev => {
        const remaining = prev.filter(gem => {
          const dist = Math.hypot(myPosition.x - gem.x, myPosition.y - gem.y);
          if (dist < 45) {
            setScore(s => s + gem.value);
            return false;
          }
          return true;
        });
        
        // Respawn gems if running low
        if (remaining.length < 5) {
          const newGems = [];
          for (let i = 0; i < 10; i++) {
            newGems.push({
              id: `gem-${Date.now()}-${i}`,
              x: 100 + Math.random() * (ARENA_WIDTH - 200),
              y: 100 + Math.random() * (ARENA_HEIGHT - 200),
              value: Math.random() > 0.7 ? 10 : Math.random() > 0.5 ? 5 : 1
            });
          }
          return [...remaining, ...newGems];
        }
        
        return remaining;
      });
    }, 33);

    return () => clearInterval(gameLoop);
  }, [isPlaying, myPosition]);

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const time = Date.now() / 1000;
      
      // Background
      ctx.fillStyle = currentMap.bg;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      
      // Animated grid pattern
      ctx.strokeStyle = currentMap.color + '20';
      ctx.lineWidth = 1;
      for (let i = 0; i < ARENA_WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let j = 0; j < ARENA_HEIGHT; j += 50) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(ARENA_WIDTH, j);
        ctx.stroke();
      }
      
      // Animated border
      ctx.strokeStyle = currentMap.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = currentMap.color;
      ctx.shadowBlur = 10 + Math.sin(time * 2) * 5;
      ctx.strokeRect(10, 10, ARENA_WIDTH - 20, ARENA_HEIGHT - 20);
      ctx.shadowBlur = 0;
      
      // Draw gems
      gems.forEach(gem => {
        const pulse = 1 + Math.sin(time * 3 + gem.x) * 0.15;
        
        // Glow
        const gemGlow = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, 30 * pulse);
        const gemColor = gem.value >= 10 ? '#FFD700' : gem.value >= 5 ? '#00D4FF' : '#22c55e';
        gemGlow.addColorStop(0, gemColor + '80');
        gemGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = gemGlow;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, 30 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Emoji
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        const emoji = gem.value >= 10 ? '💎' : gem.value >= 5 ? '🪙' : '✨';
        ctx.fillText(emoji, gem.x, gem.y + 10);
        
        // Value
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(`+${gem.value}`, gem.x, gem.y + 30);
      });
      
      // Draw player
      const playerGlow = ctx.createRadialGradient(myPosition.x, myPosition.y, 0, myPosition.x, myPosition.y, 50);
      playerGlow.addColorStop(0, myColor + '60');
      playerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = playerGlow;
      ctx.beginPath();
      ctx.arc(myPosition.x, myPosition.y, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Player body
      ctx.fillStyle = myColor;
      ctx.beginPath();
      ctx.arc(myPosition.x, myPosition.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Crown for holder
      ctx.font = '24px Arial';
      ctx.fillText('👑', myPosition.x, myPosition.y - 30);
      
      // Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(username || 'Player', myPosition.x, myPosition.y + 45);
      
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gems, myPosition, myColor, username, currentMap]);

  const goBack = () => {
    const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
    navigate(fromBullWorld ? '/games/bull-world' : '/');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#FFD700] hover:bg-[#FFD700]/10" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit Arena
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Crown className="w-8 h-8 text-[#FFD700]" />
            Holders Arena
            <Crown className="w-8 h-8 text-[#FFD700]" />
          </h1>
          <p className="text-[#FFD700]/60">Exclusive arena for CSB Bull holders only!</p>
        </div>

        {/* Game Stats */}
        <div className="flex justify-center gap-4 mb-4">
          <Card className="px-4 py-2 flex items-center gap-2 bg-[#0d2137] border-[#FFD700]/30">
            <Timer className="w-4 h-4 text-[#FFD700]" />
            <span className="text-white font-bold">{formatTime(timeLeft)}</span>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-2 bg-[#0d2137] border-[#FFD700]/30">
            <Gem className="w-4 h-4 text-[#FFD700]" />
            <span className="text-white font-bold">{score} pts</span>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-2 bg-[#0d2137] border-[#FFD700]/30">
            <Crown className="w-4 h-4 text-[#FFD700]" />
            <span className="text-white">{bullsOwned} Bulls</span>
          </Card>
        </div>

        {/* Map Selection */}
        {!isPlaying && (
          <div className="flex justify-center gap-2 mb-4">
            {ARENA_MAPS.map(map => (
              <Button
                key={map.id}
                variant={currentMap.id === map.id ? "default" : "outline"}
                className={currentMap.id === map.id 
                  ? "bg-[#FFD700] text-black" 
                  : "border-[#FFD700]/50 text-[#FFD700]"}
                onClick={() => setCurrentMap(map)}
              >
                {map.name}
              </Button>
            ))}
          </div>
        )}

        {/* Game Canvas */}
        <Card className="p-2 mb-4 overflow-hidden bg-[#0d2137] border-[#FFD700]/30">
          <canvas
            ref={canvasRef}
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            className="w-full rounded-lg"
            style={{ maxHeight: '60vh' }}
          />
        </Card>

        {/* Start/End Game */}
        <div className="text-center">
          {!isPlaying ? (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black hover:from-[#FFD700]/90 hover:to-[#FFA500]/90 font-bold px-8"
              onClick={startGame}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Round
            </Button>
          ) : (
            <div className="text-[#FFD700]/80">
              Use <kbd className="px-2 py-1 bg-[#1a3a4a] rounded">WASD</kbd> or <kbd className="px-2 py-1 bg-[#1a3a4a] rounded">Arrow Keys</kbd> to move • Collect gems before time runs out!
            </div>
          )}
        </div>

        {/* Instructions */}
        {!isPlaying && (
          <Card className="mt-4 p-4 bg-[#0d2137] border-[#FFD700]/30">
            <h3 className="font-bold text-[#FFD700] mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              How to Play
            </h3>
            <ul className="text-sm text-white/80 space-y-1">
              <li>• Collect as many gems as possible before time runs out</li>
              <li>• 💎 = 10 pts • 🪙 = 5 pts • ✨ = 1 pt</li>
              <li>• Score is converted to diamonds at the end</li>
              <li>• Exclusive to CSB Bull NFT holders!</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
