import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Play, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'spike' | 'gap';
}

const TRACK_WIDTH = 800;
const TRACK_HEIGHT = 400;
const PLAYER_SIZE = 20; // Smaller player hitbox
const LANE_COUNT = 3;
const LANE_HEIGHT = TRACK_HEIGHT / LANE_COUNT;
const OBSTACLE_WIDTH = 25; // Smaller obstacles
const OBSTACLE_HEIGHT = 50; // Much smaller height - fits in lane center only

export default function ObstacleRush() {
  const { goBack } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Player");
  const [gameState, setGameState] = useState<"waiting" | "countdown" | "racing" | "crashed" | "finished">("waiting");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [lane, setLane] = useState(1); // 0, 1, or 2
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const obstacleIdRef = useRef(0);
  const laneRef = useRef(1); // Track lane with ref to avoid stale closures

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first!");
        goBack();
        return;
      }

      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      setUsername((profile as any)?.username || "Player");
      fetchLeaderboard();
      
      // Play sound when entering game
      audioManager.playSFX('buttonPress');
    };

    init();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('game_results')
      .select('id, user_id, diamonds_won, multiplier, created_at')
      .eq('game_name', 'Obstacle Rush')
      .eq('result', 'win')
      .order('multiplier', { ascending: false })
      .limit(10);
    
    if (data) {
      const resultsWithUsernames = await Promise.all(
        data.map(async (result: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', result.user_id)
            .single();
          return {
            ...result,
            username: profile?.username || 'Anonymous'
          };
        })
      );
      setLeaderboard(resultsWithUsernames);
    }
  };

  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);
    setScore(0);
    setDistance(0);
    setSpeed(5);
    setLane(1);
    laneRef.current = 1;
    setObstacles([]);
    obstacleIdRef.current = 0;
    audioManager.playSFX('buttonPress');

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setGameState('racing');
          startRace();
          return 0;
        }
        audioManager.playSFX('coin');
        return c - 1;
      });
    }, 1000);
  };

  const startRace = () => {
    let localDistance = 0;
    let localSpeed = 8;
    
    gameLoopRef.current = setInterval(() => {
      localDistance += 1;
      localSpeed = Math.min(16, 8 + Math.floor(localDistance / 400));
      
      setDistance(localDistance);
      setScore(s => s + 1);
      setSpeed(localSpeed);

      // Spawn obstacles - starts after distance 150 for breathing room
      if (localDistance > 150) {
        const spawnChance = Math.min(0.06, 0.02 + (localDistance - 150) * 0.00005);
        if (Math.random() < spawnChance) {
          spawnObstacle();
        }
      }

      // Move obstacles with current speed
      setObstacles(prev => {
        const moved = prev.map(o => ({ ...o, x: o.x - localSpeed })).filter(o => o.x > -100);
        
        // Get current lane from ref (not stale closure!)
        const currentLane = laneRef.current;
        const playerX = 100;
        
        // Simple lane-based collision - only collide if SAME LANE
        for (const obs of moved) {
          // Check if obstacle is near player X position
          const obstacleReachesPlayer = obs.x < playerX + PLAYER_SIZE && obs.x + obs.width > playerX - PLAYER_SIZE;
          
          if (obstacleReachesPlayer) {
            // Get obstacle lane from its Y position
            const obstacleLane = Math.floor((obs.y + obs.height / 2) / LANE_HEIGHT);
            
            // Only crash if in SAME lane
            if (currentLane === obstacleLane) {
              handleCrash();
              return [];
            }
          }
        }
        
        return moved;
      });
    }, 50);
  };

  const spawnObstacle = () => {
    const laneIndex = Math.floor(Math.random() * LANE_COUNT);
    const types: ('wall' | 'spike')[] = ['wall', 'spike'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Center obstacle in lane - smaller size
    const newObstacle: Obstacle = {
      id: obstacleIdRef.current++,
      x: TRACK_WIDTH + 50,
      y: laneIndex * LANE_HEIGHT + (LANE_HEIGHT - OBSTACLE_HEIGHT) / 2, // Centered in lane
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
      type
    };
    
    setObstacles(prev => [...prev, newObstacle]);
  };

  const handleCrash = () => {
    setGameState('crashed');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    audioManager.playSFX('lose');

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Save score
    saveScore();
  };

  const [diamondsWon, setDiamondsWon] = useState(0);

  const saveScore = async () => {
    if (!userId) return;

    const diamonds = Math.max(1, Math.floor(score / 30)); // More generous diamond rewards
    setDiamondsWon(diamonds);
    
    if (diamonds > 0) {
      const { data: current } = await supabase
        .from('user_diamonds')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (current) {
        await supabase
          .from('user_diamonds')
          .update({
            balance: ((current as any).balance || 0) + diamonds,
            total_earned: ((current as any).total_earned || 0) + diamonds
          })
          .eq('user_id', userId);
      }

      // Store diamonds in sessionStorage so BullWorld can show them as "collected"
      const currentCollected = parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
      sessionStorage.setItem('mazeDiamondsCollected', String(currentCollected + diamonds));
    }

    await supabase.from('game_results').insert({
      user_id: userId,
      game_name: 'Obstacle Rush',
      result: 'win',
      diamonds_won: diamonds,
      multiplier: score
    });

    if (score > highScore) {
      setHighScore(score);
      toast.success(`🏆 New High Score: ${score}!`);
    }

    toast.success(`+${diamonds} 💎 added to wallet!`);
    fetchLeaderboard();
  };

  const changeLane = (direction: 'up' | 'down') => {
    if (gameState !== 'racing') return;
    
    audioManager.playSFX('buttonPress');
    
    if (direction === 'up' && laneRef.current > 0) {
      laneRef.current -= 1;
      setLane(laneRef.current);
    } else if (direction === 'down' && laneRef.current < LANE_COUNT - 1) {
      laneRef.current += 1;
      setLane(laneRef.current);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        changeLane('up');
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        changeLane('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lane]);

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Background
      ctx.fillStyle = '#0a1a2a';
      ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

      // Draw lanes
      for (let i = 0; i < LANE_COUNT; i++) {
        const y = i * LANE_HEIGHT;
        ctx.fillStyle = i % 2 === 0 ? '#1a2a3a' : '#152535';
        ctx.fillRect(0, y, TRACK_WIDTH, LANE_HEIGHT);
        
        // Lane divider
        ctx.strokeStyle = '#2a4a6a';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 10]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TRACK_WIDTH, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Moving road lines effect
      const offset = (distance * 3) % 40;
      ctx.strokeStyle = '#3a5a7a';
      ctx.lineWidth = 3;
      for (let i = 0; i < LANE_COUNT; i++) {
        const centerY = i * LANE_HEIGHT + LANE_HEIGHT / 2;
        ctx.beginPath();
        for (let x = -offset; x < TRACK_WIDTH; x += 40) {
          ctx.moveTo(x, centerY);
          ctx.lineTo(x + 20, centerY);
        }
        ctx.stroke();
      }

      // Draw obstacles
      obstacles.forEach(obs => {
        if (obs.type === 'wall') {
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#ff6666';
          ctx.lineWidth = 3;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          
          // Warning stripes
          ctx.fillStyle = '#ffff00';
          for (let i = 0; i < obs.height; i += 20) {
            ctx.fillRect(obs.x, obs.y + i, obs.width, 10);
          }
        } else if (obs.type === 'spike') {
          ctx.fillStyle = '#ff8800';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Draw player bull
      const playerX = 100;
      const playerY = lane * LANE_HEIGHT + LANE_HEIGHT / 2;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY + 20, 25, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bull body
      ctx.fillStyle = '#00D4FF';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY, 25, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bull head
      ctx.beginPath();
      ctx.arc(playerX + 18, playerY - 5, 12, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(playerX + 12, playerY - 12);
      ctx.quadraticCurveTo(playerX + 5, playerY - 28, playerX - 5, playerY - 22);
      ctx.moveTo(playerX + 24, playerY - 12);
      ctx.quadraticCurveTo(playerX + 31, playerY - 28, playerX + 41, playerY - 22);
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(playerX + 15, playerY - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(playerX + 16, playerY - 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Speed lines
      if (speed > 7) {
        ctx.strokeStyle = `rgba(0, 212, 255, ${(speed - 7) * 0.1})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(playerX - 30 - i * 15, playerY - 10 + Math.random() * 20);
          ctx.lineTo(playerX - 50 - i * 15, playerY - 10 + Math.random() * 20);
          ctx.stroke();
        }
      }

      // HUD
      ctx.fillStyle = '#00D4FF';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`Score: ${score}`, 20, 30);
      ctx.fillText(`Distance: ${distance}m`, 20, 55);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`Speed: ${speed}x`, TRACK_WIDTH - 120, 30);

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), TRACK_WIDTH / 2, TRACK_HEIGHT / 2 + 30);
        ctx.textAlign = 'left';
      }

      // Crash overlay
      if (gameState === 'crashed') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💥 CRASHED!', TRACK_WIDTH / 2, TRACK_HEIGHT / 2);
        ctx.textAlign = 'left';
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [lane, obstacles, distance, score, speed, countdown, gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1a2a] via-[#1a2a4a] to-[#0a1a2a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#00D4FF]" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold">Obstacle Rush</span>
          </div>
        </div>

        {/* Title */}
        <Card className="mb-4 p-4 bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500/30">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
            🚧 Obstacle Rush 🚧
          </h1>
          <p className="text-center text-orange-300 text-sm">Dodge obstacles and survive as long as possible!</p>
        </Card>

        {/* Game Canvas */}
        <Card className="mb-4 p-2 bg-black/50 border-red-500/30 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={TRACK_WIDTH}
            height={TRACK_HEIGHT}
            className="w-full rounded-lg"
          />
        </Card>

        {/* Controls */}
        {gameState === 'waiting' && (
          <Button
            onClick={startGame}
            className="w-full h-16 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
          >
            <Play className="w-6 h-6 mr-2" />
            Start Rush!
          </Button>
        )}

        {gameState === 'racing' && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="h-20 bg-gradient-to-r from-blue-600 to-cyan-600 text-2xl"
              onClick={() => changeLane('up')}
              onTouchStart={() => changeLane('up')}
            >
              <ArrowUp className="w-8 h-8" /> UP
            </Button>
            <Button
              className="h-20 bg-gradient-to-r from-blue-600 to-cyan-600 text-2xl"
              onClick={() => changeLane('down')}
              onTouchStart={() => changeLane('down')}
            >
              <ArrowDown className="w-8 h-8" /> DOWN
            </Button>
          </div>
        )}

        {gameState === 'crashed' && (
          <Card className="p-6 bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500/30 text-center">
            <h2 className="text-3xl font-bold text-red-400 mb-2">💥 Game Over!</h2>
            <p className="text-lg text-orange-300 mb-1">{username}</p>
            <p className="text-xl text-white mb-2">Score: {score}</p>
            <p className="text-lg text-orange-300 mb-2">Distance: {distance}m</p>
            <p className="text-xl text-green-400 font-bold mb-4">+{diamondsWon} 💎 Added to Wallet!</p>
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-red-600 to-orange-600"
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="mt-4 p-4 bg-black/30 border-red-500/30">
          <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> High Scores
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm bg-red-900/30 px-3 py-2 rounded">
                <span className="text-red-300">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.username || 'Anonymous'}
                </span>
                <span className="text-yellow-400 font-bold">{entry.multiplier}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-red-400/60 text-center">No scores yet!</p>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="mt-4 p-4 bg-black/30 border-red-500/30">
          <h3 className="font-bold text-red-400 mb-2">How to Play</h3>
          <ul className="text-red-300 text-sm space-y-1">
            <li>⬆️ Press UP or W to move up a lane</li>
            <li>⬇️ Press DOWN or S to move down a lane</li>
            <li>🚧 Avoid walls and obstacles</li>
            <li>💎 Survive longer = more diamonds!</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
