import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

interface RacePlayer {
  id: string;
  user_id: string;
  username: string | null;
  x: number;
  y: number;
  finished: boolean;
  finish_position: number | null;
  eliminated: boolean;
}

interface Obstacle {
  id: string;
  type: 'spinner' | 'pusher' | 'platform' | 'hammer';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  speed?: number;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 30;
const FINISH_LINE = 850;

// Course obstacles
const OBSTACLES: Obstacle[] = [
  // Spinning bars
  { id: 'spin1', type: 'spinner', x: 200, y: 300, width: 120, height: 20, rotation: 0, speed: 2 },
  { id: 'spin2', type: 'spinner', x: 400, y: 300, width: 120, height: 20, rotation: 45, speed: -2.5 },
  { id: 'spin3', type: 'spinner', x: 600, y: 300, width: 150, height: 20, rotation: 90, speed: 3 },
  // Moving platforms
  { id: 'plat1', type: 'platform', x: 150, y: 150, width: 80, height: 30, speed: 2 },
  { id: 'plat2', type: 'platform', x: 350, y: 450, width: 80, height: 30, speed: -2 },
  { id: 'plat3', type: 'platform', x: 550, y: 200, width: 80, height: 30, speed: 2.5 },
  // Pushers (horizontal obstacles)
  { id: 'push1', type: 'pusher', x: 280, y: 100, width: 60, height: 500, speed: 1.5 },
  { id: 'push2', type: 'pusher', x: 480, y: 100, width: 60, height: 500, speed: -1.5 },
  // Hammers (swinging)
  { id: 'ham1', type: 'hammer', x: 700, y: 200, width: 40, height: 100, rotation: 0, speed: 3 },
  { id: 'ham2', type: 'hammer', x: 700, y: 400, width: 40, height: 100, rotation: 180, speed: -3 },
];

const BullStampede = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Player");
  const [credits, setCredits] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RacePlayer[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'racing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [myPosition, setMyPosition] = useState({ x: 50, y: 300 });
  const [finishers, setFinishers] = useState<string[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>(OBSTACLES);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const positionRef = useRef({ x: 50, y: 300 });

  useEffect(() => {
    initUser();
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      leaveRoom();
    };
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [creditsRes, profileRes] = await Promise.all([
      supabase.from('user_credits').select('balance').eq('user_id', user.id).single(),
      supabase.from('profiles').select('username').eq('id', user.id).single()
    ]);

    setCredits((creditsRes.data as any)?.balance || 0);
    setUsername((profileRes.data as any)?.username || 'Player');
    
    joinOrCreateRoom(user.id, (profileRes.data as any)?.username);
  };

  const joinOrCreateRoom = async (uid: string, uname: string) => {
    let { data: existingRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('game_type', 'stampede')
      .eq('status', 'waiting')
      .limit(1)
      .single();

    if (!existingRoom) {
      const { data: newRoom } = await supabase
        .from('game_rooms')
        .insert({ game_type: 'stampede', status: 'waiting', max_players: 8 })
        .select()
        .single();
      existingRoom = newRoom;
    }

    if (existingRoom) {
      setRoomId(existingRoom.id);
      
      await supabase
        .from('game_room_players')
        .delete()
        .eq('room_id', existingRoom.id)
        .eq('user_id', uid);

      const startY = 100 + Math.random() * 400;
      await supabase
        .from('game_room_players')
        .insert({
          room_id: existingRoom.id,
          user_id: uid,
          username: uname,
          bet_amount: 0,
          is_active: true
        });

      positionRef.current = { x: 50, y: startY };
      setMyPosition({ x: 50, y: startY });
      subscribeToRoom(existingRoom.id);
    }
  };

  const subscribeToRoom = (rid: string) => {
    const channel = supabase
      .channel(`stampede-${rid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${rid}` }, (payload) => {
        if (payload.new) {
          const room = payload.new as any;
          if (room.status === 'playing' && gameState !== 'racing' && gameState !== 'countdown') {
            startCountdown();
          } else if (room.status === 'finished') {
            setGameState('finished');
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_room_players', filter: `room_id=eq.${rid}` }, fetchPlayers)
      .subscribe();

    fetchPlayers();
  };

  const fetchPlayers = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('game_room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true);
    
    if (data) {
      const mapped = data.map((p: any, i: number) => ({
        id: p.id,
        user_id: p.user_id,
        username: p.username,
        x: p.user_id === userId ? positionRef.current.x : 50,
        y: 100 + i * 80,
        finished: false,
        finish_position: null,
        eliminated: false
      }));
      setPlayers(mapped);
    }
  };

  const leaveRoom = async () => {
    if (!userId || !roomId) return;
    await supabase
      .from('game_room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
  };

  const startGame = async () => {
    if (!roomId || players.length < 1) return;
    
    await supabase
      .from('game_rooms')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', roomId);
    
    startCountdown();
  };

  const startCountdown = () => {
    setGameState('countdown');
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setGameState('racing');
          startRace();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const startRace = () => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gameLoop();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      e.preventDefault();
      keysPressed.current.add(e.key.toLowerCase());
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase());
  };

  const gameLoop = useCallback(() => {
    if (gameState !== 'racing') return;

    // Update obstacles
    setObstacles(prev => prev.map(obs => {
      if (obs.type === 'spinner' || obs.type === 'hammer') {
        return { ...obs, rotation: ((obs.rotation || 0) + (obs.speed || 0)) % 360 };
      }
      if (obs.type === 'platform' || obs.type === 'pusher') {
        let newY = obs.y + (obs.speed || 0);
        if (newY < 50 || newY > CANVAS_HEIGHT - 50 - obs.height) {
          return { ...obs, speed: -(obs.speed || 0) };
        }
        return { ...obs, y: newY };
      }
      return obs;
    }));

    // Move player
    let dx = 0, dy = 0;
    const speed = 5;
    
    if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) dy = -speed;
    if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) dy = speed;
    if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) dx = -speed;
    if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) dx = speed;

    positionRef.current = {
      x: Math.max(20, Math.min(CANVAS_WIDTH - 20, positionRef.current.x + dx)),
      y: Math.max(20, Math.min(CANVAS_HEIGHT - 20, positionRef.current.y + dy))
    };
    setMyPosition({ ...positionRef.current });

    // Check finish
    if (positionRef.current.x >= FINISH_LINE && !finishers.includes(userId || '')) {
      const position = finishers.length + 1;
      setFinishers(prev => [...prev, userId || '']);
      
      const winnings = position === 1 ? 100 : position === 2 ? 50 : position === 3 ? 25 : 10;
      toast.success(`🏆 You finished #${position}! +${winnings} credits!`);
      
      if (userId) {
        supabase.from('user_credits')
          .update({ balance: credits + winnings })
          .eq('user_id', userId);
        setCredits(c => c + winnings);
      }
    }

    // Check obstacle collisions (simplified push back)
    obstacles.forEach(obs => {
      if (obs.type === 'pusher') {
        if (positionRef.current.x > obs.x - 30 && 
            positionRef.current.x < obs.x + obs.width + 30 &&
            positionRef.current.y > obs.y &&
            positionRef.current.y < obs.y + obs.height) {
          positionRef.current.x = Math.max(20, positionRef.current.x - 10);
          setMyPosition({ ...positionRef.current });
        }
      }
      if (obs.type === 'spinner') {
        const dist = Math.hypot(positionRef.current.x - obs.x, positionRef.current.y - obs.y);
        if (dist < 70) {
          const angle = Math.atan2(positionRef.current.y - obs.y, positionRef.current.x - obs.x);
          positionRef.current.x += Math.cos(angle) * 8;
          positionRef.current.y += Math.sin(angle) * 8;
          positionRef.current.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, positionRef.current.x));
          positionRef.current.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, positionRef.current.y));
          setMyPosition({ ...positionRef.current });
        }
      }
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, obstacles, finishers, userId, credits]);

  useEffect(() => {
    if (gameState === 'racing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, gameLoop]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Background - Cardano themed
      const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.5, '#0d2847');
      grad.addColorStop(1, '#0f3a5f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Start zone
      ctx.fillStyle = 'rgba(0, 255, 100, 0.2)';
      ctx.fillRect(0, 0, 80, CANVAS_HEIGHT);
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 16px Arial';
      ctx.save();
      ctx.translate(40, CANVAS_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('START', 0, 0);
      ctx.restore();

      // Finish zone
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.fillRect(FINISH_LINE, 0, CANVAS_WIDTH - FINISH_LINE, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.save();
      ctx.translate(CANVAS_WIDTH - 25, CANVAS_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('FINISH 🏆', 0, 0);
      ctx.restore();

      // Draw obstacles
      obstacles.forEach(obs => {
        ctx.save();
        
        if (obs.type === 'spinner') {
          ctx.translate(obs.x, obs.y);
          ctx.rotate((obs.rotation || 0) * Math.PI / 180);
          
          // Spinner arm
          const armGrad = ctx.createLinearGradient(-obs.width/2, 0, obs.width/2, 0);
          armGrad.addColorStop(0, '#ff4444');
          armGrad.addColorStop(0.5, '#ff6666');
          armGrad.addColorStop(1, '#ff4444');
          ctx.fillStyle = armGrad;
          ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
          
          // Center circle
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff8800';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        
        if (obs.type === 'pusher') {
          const pushGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y);
          pushGrad.addColorStop(0, '#8844ff');
          pushGrad.addColorStop(0.5, '#aa66ff');
          pushGrad.addColorStop(1, '#8844ff');
          ctx.fillStyle = pushGrad;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          
          // Warning stripes
          ctx.fillStyle = '#ffcc00';
          for (let i = 0; i < obs.height; i += 40) {
            ctx.fillRect(obs.x, obs.y + i, obs.width, 10);
          }
        }
        
        if (obs.type === 'platform') {
          ctx.fillStyle = '#00cc88';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#00ffaa';
          ctx.lineWidth = 3;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
        
        if (obs.type === 'hammer') {
          ctx.translate(obs.x, obs.y);
          ctx.rotate(Math.sin((obs.rotation || 0) * Math.PI / 90) * 0.8);
          
          ctx.fillStyle = '#cc4400';
          ctx.fillRect(-obs.width/2, 0, obs.width, obs.height);
          
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(-obs.width/2 - 10, obs.height - 30, obs.width + 20, 30);
        }
        
        ctx.restore();
      });

      // Draw other players (simulated positions)
      players.filter(p => p.user_id !== userId).forEach((player, i) => {
        const pColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 5];
        
        // Bull body
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.ellipse(50 + Math.random() * 10, player.y, PLAYER_SIZE, PLAYER_SIZE * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.username || 'Player', 50, player.y - PLAYER_SIZE);
      });

      // Draw my player (bull)
      const px = positionRef.current.x;
      const py = positionRef.current.y;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py + PLAYER_SIZE, PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Bull body - Cardano blue
      ctx.fillStyle = '#00D4FF';
      ctx.beginPath();
      ctx.ellipse(px, py, PLAYER_SIZE, PLAYER_SIZE * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Bull head
      ctx.fillStyle = '#00B8E6';
      ctx.beginPath();
      ctx.arc(px + PLAYER_SIZE * 0.6, py, PLAYER_SIZE * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Horns
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_SIZE * 0.8, py - PLAYER_SIZE * 0.3);
      ctx.lineTo(px + PLAYER_SIZE * 1.3, py - PLAYER_SIZE * 0.8);
      ctx.lineTo(px + PLAYER_SIZE * 0.9, py - PLAYER_SIZE * 0.2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_SIZE * 0.8, py + PLAYER_SIZE * 0.3);
      ctx.lineTo(px + PLAYER_SIZE * 1.3, py + PLAYER_SIZE * 0.8);
      ctx.lineTo(px + PLAYER_SIZE * 0.9, py + PLAYER_SIZE * 0.2);
      ctx.fill();
      
      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px + PLAYER_SIZE * 0.7, py - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(px + PLAYER_SIZE * 0.75, py - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Name tag
      ctx.fillStyle = '#00D4FF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(username + ' (You)', px, py - PLAYER_SIZE - 10);

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#00D4FF';
        ctx.fillText('GET READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
      }

      requestAnimationFrame(render);
    };

    render();
  }, [obstacles, myPosition, players, gameState, countdown, username, userId]);

  const resetGame = async () => {
    if (!roomId) return;
    setGameState('waiting');
    setFinishers([]);
    positionRef.current = { x: 50, y: 300 };
    setMyPosition({ x: 50, y: 300 });
    setObstacles(OBSTACLES);
    
    await supabase
      .from('game_rooms')
      .update({ status: 'waiting', round_data: {} })
      .eq('id', roomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            {getBackLabel()}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="font-bold">{players.length} Players</span>
            </div>
            <div className="text-xl font-bold">💎 {credits}</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🐂 Bull Stampede 🏃
          </h1>
          <p className="text-muted-foreground">
            Race through obstacles! First to finish wins! Use Arrow Keys or WASD to move.
          </p>
        </div>

        <div className="flex justify-center gap-6">
          <Card className="p-4 bg-card/95">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="rounded-lg border-2 border-primary/30"
            />
            
            <div className="mt-4 flex justify-center gap-4">
              {gameState === 'waiting' && (
                <Button size="lg" onClick={startGame} className="text-lg px-8">
                  <Play className="w-5 h-5 mr-2" />
                  Start Race ({players.length} player{players.length !== 1 ? 's' : ''})
                </Button>
              )}
              
              {gameState === 'finished' && (
                <Button size="lg" onClick={resetGame} className="text-lg px-8">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-card/95 w-64">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
            </h2>
            
            <div className="space-y-2">
              {finishers.map((fid, i) => {
                const player = players.find(p => p.user_id === fid);
                return (
                  <div key={fid} className={`p-2 rounded ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20' : i === 2 ? 'bg-orange-600/20' : 'bg-muted/50'}`}>
                    <span className="font-bold">#{i + 1}</span> {player?.username || 'Player'}
                    {fid === userId && ' (You)'}
                  </div>
                );
              })}
              
              {finishers.length === 0 && (
                <p className="text-muted-foreground text-sm">No finishers yet...</p>
              )}
            </div>

            <div className="mt-6 p-3 bg-muted/30 rounded-lg text-sm">
              <p className="font-bold mb-2">🎮 Controls:</p>
              <p>Arrow Keys / WASD to move</p>
              <p className="mt-2 font-bold">💰 Prizes:</p>
              <p>🥇 1st: 100 credits</p>
              <p>🥈 2nd: 50 credits</p>
              <p>🥉 3rd: 25 credits</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BullStampede;
