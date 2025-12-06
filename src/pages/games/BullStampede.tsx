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

interface LeaderboardEntry {
  id: string;
  username: string | null;
  wallet_name: string | null;
  completion_time_ms: number;
  created_at: string;
}

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1000;
const PLAYER_SIZE = 24;
const FINISH_LINE = 1720;

// Simplified maze walls for better performance
const MAZE_WALLS = [
  // Outer boundary - LEFT wall with gap for entry
  { x: 80, y: 50, w: 20, h: 380 },
  { x: 80, y: 570, w: 20, h: 380 },
  // Top and bottom walls
  { x: 80, y: 50, w: 1660, h: 20 },
  { x: 80, y: 930, w: 1660, h: 20 },
  // Simplified internal walls
  { x: 180, y: 100, w: 20, h: 300 },
  { x: 180, y: 550, w: 20, h: 300 },
  { x: 300, y: 200, w: 200, h: 20 },
  { x: 300, y: 700, w: 200, h: 20 },
  { x: 400, y: 350, w: 20, h: 250 },
  { x: 550, y: 100, w: 20, h: 200 },
  { x: 550, y: 600, w: 20, h: 250 },
  { x: 650, y: 300, w: 150, h: 20 },
  { x: 650, y: 500, w: 150, h: 20 },
  { x: 750, y: 150, w: 20, h: 120 },
  { x: 750, y: 700, w: 20, h: 150 },
  { x: 850, y: 250, w: 20, h: 200 },
  { x: 850, y: 600, w: 150, h: 20 },
  { x: 950, y: 100, w: 20, h: 150 },
  { x: 950, y: 400, w: 200, h: 20 },
  { x: 950, y: 750, w: 20, h: 150 },
  { x: 1100, y: 200, w: 20, h: 150 },
  { x: 1100, y: 550, w: 20, h: 200 },
  { x: 1200, y: 100, w: 20, h: 100 },
  { x: 1200, y: 350, w: 150, h: 20 },
  { x: 1200, y: 650, w: 150, h: 20 },
  { x: 1200, y: 800, w: 20, h: 130 },
  { x: 1350, y: 200, w: 20, h: 250 },
  { x: 1350, y: 550, w: 20, h: 200 },
  { x: 1500, y: 100, w: 20, h: 200 },
  { x: 1500, y: 450, w: 150, h: 20 },
  { x: 1500, y: 700, w: 20, h: 150 },
  { x: 1620, y: 300, w: 20, h: 150 },
  { x: 1620, y: 600, w: 20, h: 150 },
];

const BullStampede = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const renderLoopRef = useRef<number>(0);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Player");
  const [walletName, setWalletName] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [bullColor, setBullColor] = useState("#00D4FF");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<RacePlayer[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'racing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [myPosition, setMyPosition] = useState({ x: 30, y: 500 });
  const [finishers, setFinishers] = useState<string[]>([]);
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const raceStartTime = useRef<number>(0);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const positionRef = useRef({ x: 30, y: 500 });
  
  // Joystick state
  const joystickRef = useRef<{ active: boolean; dx: number; dy: number }>({ active: false, dx: 0, dy: 0 });
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 800);
      const maxHeight = Math.min(window.innerHeight - 280, 400);
      setCanvasSize({ width: maxWidth, height: maxHeight });
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    initUser();
    fetchLeaderboard();
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
      leaveRoom();
    };
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('maze_leaderboard')
      .select('*')
      .order('completion_time_ms', { ascending: true })
      .limit(10);
    if (data) setLeaderboard(data);
  };

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [creditsRes, profileRes, worldPlayerRes] = await Promise.all([
      supabase.from('user_credits').select('balance').eq('user_id', user.id).single(),
      supabase.from('profiles').select('username, wallet_name').eq('id', user.id).single(),
      supabase.from('world_players').select('color').eq('user_id', user.id).single()
    ]);

    setCredits((creditsRes.data as any)?.balance || 0);
    setUsername((profileRes.data as any)?.username || 'Player');
    setWalletName((profileRes.data as any)?.wallet_name || null);
    if (worldPlayerRes.data?.color) {
      setBullColor(worldPlayerRes.data.color);
    }
    
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

      await supabase
        .from('game_room_players')
        .insert({
          room_id: existingRoom.id,
          user_id: uid,
          username: uname,
          bet_amount: 0,
          is_active: true
        });

      positionRef.current = { x: 30, y: 500 };
      setMyPosition({ x: 30, y: 500 });
      subscribeToRoom(existingRoom.id);
    }
  };

  const subscribeToRoom = (rid: string) => {
    supabase
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
        x: p.user_id === userId ? positionRef.current.x : 30,
        y: 200 + i * 100,
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

  const startGame = async (singlePlayer = false) => {
    setIsSinglePlayer(singlePlayer);
    setFinalTime(null);
    
    if (!singlePlayer && roomId) {
      await supabase
        .from('game_rooms')
        .update({ status: 'playing', started_at: new Date().toISOString() })
        .eq('id', roomId);
    }
    
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
    raceStartTime.current = Date.now();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gameLoop();
  };

  const checkWallCollision = (x: number, y: number): boolean => {
    const halfSize = PLAYER_SIZE / 2;
    for (const wall of MAZE_WALLS) {
      if (x + halfSize > wall.x && 
          x - halfSize < wall.x + wall.w &&
          y + halfSize > wall.y && 
          y - halfSize < wall.y + wall.h) {
        return true;
      }
    }
    return false;
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

  // Joystick handlers
  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'racing') return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    
    joystickCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joystickRef.current = { active: true, dx: 0, dy: 0 };
  }, [gameState]);

  const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickRef.current.active || !joystickCenterRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    
    const maxDist = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    
    joystickRef.current.dx = (Math.cos(angle) * clampedDist) / maxDist;
    joystickRef.current.dy = (Math.sin(angle) * clampedDist) / maxDist;
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickRef.current = { active: false, dx: 0, dy: 0 };
    joystickCenterRef.current = null;
  }, []);

  const saveToLeaderboard = async (timeMs: number) => {
    if (!userId) return;
    
    await supabase.from('maze_leaderboard').insert({
      user_id: userId,
      username: username, // Save username, not wallet_name
      wallet_name: username, // Also set wallet_name to username for display
      completion_time_ms: timeMs
    });
    
    fetchLeaderboard();
  };

  const gameLoop = useCallback(() => {
    if (gameState !== 'racing') return;

    const now = Date.now();
    const elapsed = now - raceStartTime.current;
    setRaceTime(Math.floor(elapsed / 1000));

    // Move player with keyboard or joystick
    let dx = 0, dy = 0;
    const speed = 6;
    
    // Keyboard input
    const up = keysPressed.current.has('arrowup') || keysPressed.current.has('w');
    const down = keysPressed.current.has('arrowdown') || keysPressed.current.has('s');
    const left = keysPressed.current.has('arrowleft') || keysPressed.current.has('a');
    const right = keysPressed.current.has('arrowright') || keysPressed.current.has('d');
    
    if (up) dy = -speed;
    if (down) dy = speed;
    if (left) dx = -speed;
    if (right) dx = speed;
    
    // Joystick input (overrides keyboard if active)
    if (joystickRef.current.active) {
      dx = joystickRef.current.dx * speed;
      dy = joystickRef.current.dy * speed;
    }

    if (dx !== 0 || dy !== 0) {
      const newX = Math.max(20, Math.min(WORLD_WIDTH - 20, positionRef.current.x + dx));
      const newY = Math.max(70, Math.min(WORLD_HEIGHT - 40, positionRef.current.y + dy));

      if (!checkWallCollision(newX, positionRef.current.y)) {
        positionRef.current.x = newX;
      }
      if (!checkWallCollision(positionRef.current.x, newY)) {
        positionRef.current.y = newY;
      }
      setMyPosition({ ...positionRef.current });
    }

    // Check finish
    if (positionRef.current.x >= FINISH_LINE && !finishers.includes(userId || '')) {
      const completionTime = Date.now() - raceStartTime.current;
      setFinalTime(completionTime);
      setFinishers(prev => [...prev, userId || '']);
      setGameState('finished');
      
      const seconds = Math.floor(completionTime / 1000);
      const diamondReward = isSinglePlayer ? Math.max(5, 50 - seconds) : 75;
      toast.success(`🏆 Maze Complete! Time: ${(completionTime / 1000).toFixed(2)}s +${diamondReward} 💎!`);
      
      saveToLeaderboard(completionTime);
      
      // Award diamonds to user
      if (userId) {
        supabase.from('user_diamonds')
          .select('balance, total_earned')
          .eq('user_id', userId)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase.from('user_diamonds')
                .update({ 
                  balance: (data.balance || 0) + diamondReward,
                  total_earned: (data.total_earned || 0) + diamondReward
                })
                .eq('user_id', userId);
            }
          });
        
        // Store maze diamonds in sessionStorage so BullWorld can show them
        const currentMazeDiamonds = parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
        sessionStorage.setItem('mazeDiamondsCollected', String(currentMazeDiamonds + diamondReward));
      }
      return;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, finishers, userId, credits, isSinglePlayer, username, walletName]);

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

  // Optimized render loop - separate from game logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastRenderTime = 0;
    const targetFPS = 30; // Limit to 30 FPS for performance
    const frameInterval = 1000 / targetFPS;

    const render = (timestamp: number) => {
      if (timestamp - lastRenderTime < frameInterval) {
        renderLoopRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = timestamp;

      // Camera follow player
      const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvasSize.width, positionRef.current.x - canvasSize.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvasSize.height, positionRef.current.y - canvasSize.height / 2));

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // Simple gradient background
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Simple floor grid (reduced density)
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < WORLD_WIDTH; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < WORLD_HEIGHT; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      // Draw maze walls (simplified rendering)
      ctx.fillStyle = '#1a4a6f';
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 2;
      MAZE_WALLS.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      });

      // Start zone
      ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
      ctx.fillRect(0, 50, 80, WORLD_HEIGHT - 100);
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 18px Arial';
      ctx.save();
      ctx.translate(40, WORLD_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('START', 0, 0);
      ctx.restore();

      // Entry arrow
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('→', 55, 500);

      // Finish zone
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(FINISH_LINE, 50, WORLD_WIDTH - FINISH_LINE, WORLD_HEIGHT - 100);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px Arial';
      ctx.save();
      ctx.translate(WORLD_WIDTH - 30, WORLD_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', 0, 0);
      ctx.restore();

      // Draw player (simplified bull)
      const px = positionRef.current.x;
      const py = positionRef.current.y;
      
      // Bull body with glow
      ctx.shadowColor = bullColor;
      ctx.shadowBlur = 15;
      ctx.fillStyle = bullColor;
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Horns
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(px - 10, py - PLAYER_SIZE + 5);
      ctx.lineTo(px - 18, py - PLAYER_SIZE - 12);
      ctx.lineTo(px - 4, py - PLAYER_SIZE + 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px + 10, py - PLAYER_SIZE + 5);
      ctx.lineTo(px + 18, py - PLAYER_SIZE - 12);
      ctx.lineTo(px + 4, py - PLAYER_SIZE + 8);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px - 6, py - 3, 5, 0, Math.PI * 2);
      ctx.arc(px + 6, py - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(px - 5, py - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(px + 7, py - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Name tag
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(username, px, py - PLAYER_SIZE - 18);

      ctx.restore();

      // UI overlay (fixed position) - only during racing
      if (gameState === 'racing') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(canvasSize.width/2 - 50, 8, 100, 32);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${raceTime}s`, canvasSize.width/2, 32);
        
        // Progress bar
        const progress = Math.min(1, positionRef.current.x / FINISH_LINE);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 48, canvasSize.width - 20, 6);
        ctx.fillStyle = '#00D4FF';
        ctx.fillRect(10, 48, (canvasSize.width - 20) * progress, 6);
      }

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), canvasSize.width / 2, canvasSize.height / 2 + 25);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00D4FF';
        ctx.fillText('GET READY!', canvasSize.width / 2, canvasSize.height / 2 - 50);
      }

      renderLoopRef.current = requestAnimationFrame(render);
    };

    renderLoopRef.current = requestAnimationFrame(render);
    return () => {
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
    };
  }, [myPosition, gameState, countdown, username, raceTime, canvasSize, bullColor]);

  const resetGame = async () => {
    setGameState('waiting');
    setFinishers([]);
    setRaceTime(0);
    setFinalTime(null);
    setIsSinglePlayer(false);
    positionRef.current = { x: 30, y: 500 };
    setMyPosition({ x: 30, y: 500 });
    
    if (roomId) {
      await supabase
        .from('game_rooms')
        .update({ status: 'waiting', round_data: {} })
        .eq('id', roomId);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return seconds.toFixed(2) + 's';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-3 py-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">{getBackLabel()}</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-primary text-sm">
              <Users className="w-4 h-4" />
              <span className="font-bold">{players.length}</span>
            </div>
            <div className="text-lg font-bold">💎 {credits}</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 py-2">
        <div className="text-center mb-2">
          <h1 className="text-xl sm:text-2xl font-bold gradient-gold bg-clip-text text-transparent">
            🐂 Bull Maze 🏆
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row items-start justify-center gap-3">
          <div className="flex flex-col items-center gap-2 w-full lg:w-auto">
            <Card className="p-2 bg-card/95 w-full max-w-[832px]">
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="rounded-lg border-2 border-primary/30 w-full touch-none"
              />
              
              {/* Joystick Control - only show during racing on touch devices */}
              {gameState === 'racing' && (
                <div className="flex justify-center mt-2">
                  <div
                    className="relative w-28 h-28 rounded-full bg-black/50 border-2 border-primary/50 flex items-center justify-center select-none"
                    onTouchStart={handleJoystickStart}
                    onTouchMove={handleJoystickMove}
                    onTouchEnd={handleJoystickEnd}
                    onMouseDown={handleJoystickStart}
                    onMouseMove={handleJoystickMove}
                    onMouseUp={handleJoystickEnd}
                    onMouseLeave={handleJoystickEnd}
                  >
                    <div 
                      className="w-12 h-12 rounded-full bg-primary/80 border-2 border-primary shadow-lg transition-transform"
                      style={{
                        transform: joystickRef.current.active 
                          ? `translate(${joystickRef.current.dx * 30}px, ${joystickRef.current.dy * 30}px)` 
                          : 'translate(0, 0)'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="absolute top-1 text-xl">↑</span>
                      <span className="absolute bottom-1 text-xl">↓</span>
                      <span className="absolute left-1 text-xl">←</span>
                      <span className="absolute right-1 text-xl">→</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-2 flex justify-center gap-2">
                {gameState === 'waiting' && (
                  <>
                    <Button size="lg" onClick={() => startGame(true)} className="text-sm px-4 bg-primary">
                      <Play className="w-4 h-4 mr-1" />
                      Solo Run
                    </Button>
                    <Button size="lg" onClick={() => startGame(false)} variant="outline" className="text-sm px-4">
                      <Users className="w-4 h-4 mr-1" />
                      Multi ({players.length})
                    </Button>
                  </>
                )}
                
                {gameState === 'finished' && (
                  <Button size="lg" onClick={resetGame} className="text-sm px-4">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Play Again
                  </Button>
                )}
              </div>
            </Card>

            {/* Results */}
            {gameState === 'finished' && finalTime && (
              <Card className="p-3 bg-card/95 w-full max-w-[400px]">
                <h2 className="text-lg font-bold mb-2 text-center text-yellow-500">
                  🏆 Your Time: {formatTime(finalTime)}
                </h2>
              </Card>
            )}
          </div>

          {/* Leaderboard */}
          <Card className="p-3 bg-card/95 w-full lg:w-72">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Fastest Times
            </h2>
            
            {leaderboard.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {leaderboard.map((entry, i) => (
                  <div 
                    key={entry.id} 
                    className={`p-2 rounded text-sm flex justify-between items-center ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-orange-600/20 text-orange-400' : 
                      'bg-muted/30'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-bold w-5">#{i + 1}</span>
                      <span className="truncate max-w-[100px]">
                        {entry.username || 'Player'}
                      </span>
                    </span>
                    <span className="font-mono font-bold">{formatTime(entry.completion_time_ms)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No times yet. Be the first!</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BullStampede;
