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

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1000;
const PLAYER_SIZE = 24;
const FINISH_LINE = 1720;

// Maze walls with entry gap at start (left side around y=450-550)
const MAZE_WALLS = [
  // Outer boundary - LEFT wall with gap for entry
  { x: 80, y: 50, w: 20, h: 380 },   // Top part of left wall
  { x: 80, y: 570, w: 20, h: 380 },  // Bottom part of left wall (gap from 430-570)
  // Top and bottom walls
  { x: 80, y: 50, w: 1660, h: 20 },
  { x: 80, y: 930, w: 1660, h: 20 },
  // Maze internal walls - simplified for better performance
  { x: 160, y: 100, w: 20, h: 250 },
  { x: 160, y: 450, w: 20, h: 250 },
  { x: 160, y: 800, w: 20, h: 130 },
  { x: 240, y: 200, w: 150, h: 20 },
  { x: 240, y: 600, w: 150, h: 20 },
  { x: 320, y: 350, w: 20, h: 200 },
  { x: 320, y: 700, w: 20, h: 150 },
  { x: 420, y: 100, w: 20, h: 200 },
  { x: 420, y: 450, w: 150, h: 20 },
  { x: 420, y: 750, w: 100, h: 20 },
  { x: 500, y: 250, w: 20, h: 150 },
  { x: 500, y: 550, w: 20, h: 150 },
  { x: 580, y: 100, w: 20, h: 120 },
  { x: 580, y: 350, w: 120, h: 20 },
  { x: 580, y: 650, w: 20, h: 200 },
  { x: 580, y: 850, w: 150, h: 20 },
  { x: 680, y: 180, w: 20, h: 140 },
  { x: 680, y: 500, w: 100, h: 20 },
  { x: 680, y: 750, w: 20, h: 100 },
  { x: 780, y: 100, w: 20, h: 100 },
  { x: 780, y: 280, w: 100, h: 20 },
  { x: 780, y: 400, w: 20, h: 120 },
  { x: 780, y: 600, w: 150, h: 20 },
  { x: 780, y: 800, w: 20, h: 130 },
  { x: 880, y: 150, w: 20, h: 100 },
  { x: 880, y: 350, w: 100, h: 20 },
  { x: 880, y: 500, w: 20, h: 120 },
  { x: 880, y: 720, w: 100, h: 20 },
  { x: 980, y: 100, w: 20, h: 200 },
  { x: 980, y: 450, w: 150, h: 20 },
  { x: 980, y: 600, w: 20, h: 140 },
  { x: 980, y: 850, w: 100, h: 20 },
  { x: 1080, y: 250, w: 20, h: 150 },
  { x: 1080, y: 550, w: 100, h: 20 },
  { x: 1080, y: 750, w: 20, h: 100 },
  { x: 1180, y: 100, w: 20, h: 120 },
  { x: 1180, y: 320, w: 100, h: 20 },
  { x: 1180, y: 450, w: 20, h: 120 },
  { x: 1180, y: 650, w: 150, h: 20 },
  { x: 1180, y: 820, w: 20, h: 110 },
  { x: 1280, y: 180, w: 20, h: 100 },
  { x: 1280, y: 400, w: 100, h: 20 },
  { x: 1280, y: 550, w: 20, h: 120 },
  { x: 1280, y: 780, w: 150, h: 20 },
  { x: 1380, y: 100, w: 20, h: 250 },
  { x: 1380, y: 500, w: 100, h: 20 },
  { x: 1380, y: 650, w: 20, h: 100 },
  { x: 1380, y: 860, w: 100, h: 20 },
  { x: 1480, y: 300, w: 20, h: 150 },
  { x: 1480, y: 550, w: 20, h: 120 },
  { x: 1480, y: 750, w: 100, h: 20 },
  { x: 1580, y: 100, w: 20, h: 150 },
  { x: 1580, y: 350, w: 20, h: 200 },
  { x: 1580, y: 650, w: 20, h: 150 },
  { x: 1580, y: 880, w: 20, h: 50 },
  // Exit gap near finish around y=450-550
];

// Floor decorations
const FLOOR_DECORATIONS = [
  { x: 150, y: 150, type: 'ada', size: 30 },
  { x: 350, y: 850, type: 'ada', size: 25 },
  { x: 550, y: 450, type: 'star', size: 20 },
  { x: 750, y: 200, type: 'ada', size: 35 },
  { x: 950, y: 750, type: 'star', size: 25 },
  { x: 1150, y: 350, type: 'ada', size: 30 },
  { x: 1350, y: 850, type: 'star', size: 20 },
  { x: 1550, y: 450, type: 'ada', size: 25 },
  { x: 300, y: 600, type: 'diamond', size: 22 },
  { x: 600, y: 700, type: 'diamond', size: 28 },
  { x: 900, y: 300, type: 'diamond', size: 24 },
  { x: 1200, y: 500, type: 'diamond', size: 26 },
  { x: 1500, y: 600, type: 'diamond', size: 22 },
];

const BullStampede = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Player");
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
  const raceStartTime = useRef<number>(0);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const positionRef = useRef({ x: 30, y: 500 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 800);
      const maxHeight = Math.min(window.innerHeight - 200, 500);
      setCanvasSize({ width: maxWidth, height: maxHeight });
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

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

    const [creditsRes, profileRes, worldPlayerRes] = await Promise.all([
      supabase.from('user_credits').select('balance').eq('user_id', user.id).single(),
      supabase.from('profiles').select('username').eq('id', user.id).single(),
      supabase.from('world_players').select('color').eq('user_id', user.id).single()
    ]);

    setCredits((creditsRes.data as any)?.balance || 0);
    setUsername((profileRes.data as any)?.username || 'Player');
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
    for (const wall of MAZE_WALLS) {
      if (x + PLAYER_SIZE/2 > wall.x && 
          x - PLAYER_SIZE/2 < wall.x + wall.w &&
          y + PLAYER_SIZE/2 > wall.y && 
          y - PLAYER_SIZE/2 < wall.y + wall.h) {
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

  // Touch handlers for drag-to-move
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'racing') return;
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, [gameState]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'racing' || !lastTouchRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = (touch.clientX - lastTouchRef.current.x) * 0.8;
    const dy = (touch.clientY - lastTouchRef.current.y) * 0.8;
    
    const newX = Math.max(20, Math.min(WORLD_WIDTH - 20, positionRef.current.x + dx));
    const newY = Math.max(70, Math.min(WORLD_HEIGHT - 40, positionRef.current.y + dy));

    if (!checkWallCollision(newX, positionRef.current.y)) {
      positionRef.current.x = newX;
    }
    if (!checkWallCollision(positionRef.current.x, newY)) {
      positionRef.current.y = newY;
    }
    setMyPosition({ ...positionRef.current });
    
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, [gameState]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    lastTouchRef.current = null;
  }, []);

  const gameLoop = useCallback(() => {
    if (gameState !== 'racing') return;

    setRaceTime(Math.floor((Date.now() - raceStartTime.current) / 1000));

    // Move player with keyboard
    let dx = 0, dy = 0;
    const speed = 5;
    
    const up = keysPressed.current.has('arrowup') || keysPressed.current.has('w');
    const down = keysPressed.current.has('arrowdown') || keysPressed.current.has('s');
    const left = keysPressed.current.has('arrowleft') || keysPressed.current.has('a');
    const right = keysPressed.current.has('arrowright') || keysPressed.current.has('d');
    
    if (up) dy = -speed;
    if (down) dy = speed;
    if (left) dx = -speed;
    if (right) dx = speed;

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
      const finalTime = Math.floor((Date.now() - raceStartTime.current) / 1000);
      setFinishers(prev => [...prev, userId || '']);
      setGameState('finished');
      
      const winnings = isSinglePlayer ? Math.max(10, 150 - finalTime * 2) : 150;
      toast.success(`🏆 Maze Complete! Time: ${finalTime}s +${winnings} credits!`);
      
      if (userId) {
        supabase.from('user_credits')
          .update({ balance: credits + winnings })
          .eq('user_id', userId);
        setCredits(c => c + winnings);
      }
      return;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, finishers, userId, credits, isSinglePlayer]);

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

  // Render canvas with camera follow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Camera follow player
      const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvasSize.width, positionRef.current.x - canvasSize.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvasSize.height, positionRef.current.y - canvasSize.height / 2));

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // Beautiful gradient background
      const grad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.3, '#0d2847');
      grad.addColorStop(0.6, '#0f3a5f');
      grad.addColorStop(1, '#1a4a6f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Floor grid pattern
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < WORLD_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < WORLD_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      // Floor decorations
      FLOOR_DECORATIONS.forEach(dec => {
        ctx.save();
        ctx.translate(dec.x, dec.y);
        ctx.globalAlpha = 0.3;
        
        if (dec.type === 'ada') {
          ctx.strokeStyle = '#00D4FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, dec.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-dec.size * 0.6, -dec.size * 0.3);
          ctx.lineTo(0, -dec.size * 0.8);
          ctx.lineTo(dec.size * 0.6, -dec.size * 0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-dec.size * 0.4, dec.size * 0.3);
          ctx.lineTo(dec.size * 0.4, dec.size * 0.3);
          ctx.stroke();
        } else if (dec.type === 'star') {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const r = i % 2 === 0 ? dec.size : dec.size * 0.5;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else if (dec.type === 'diamond') {
          ctx.fillStyle = '#00FFAA';
          ctx.beginPath();
          ctx.moveTo(0, -dec.size);
          ctx.lineTo(dec.size * 0.6, 0);
          ctx.lineTo(0, dec.size);
          ctx.lineTo(-dec.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw maze walls
      MAZE_WALLS.forEach(wall => {
        const wallGrad = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
        wallGrad.addColorStop(0, '#1a3a5c');
        wallGrad.addColorStop(0.5, '#2a5a8c');
        wallGrad.addColorStop(1, '#1a3a5c');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        
        ctx.shadowColor = '#00D4FF';
        ctx.shadowBlur = 8;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        ctx.shadowBlur = 0;
      });

      // Start zone (before maze entry)
      const startGrad = ctx.createLinearGradient(0, 50, 80, 50);
      startGrad.addColorStop(0, 'rgba(0, 255, 100, 0.4)');
      startGrad.addColorStop(1, 'rgba(0, 255, 100, 0.1)');
      ctx.fillStyle = startGrad;
      ctx.fillRect(0, 50, 80, WORLD_HEIGHT - 100);
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 16px Arial';
      ctx.save();
      ctx.translate(40, WORLD_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('🏁 START', 0, 0);
      ctx.restore();

      // Entry arrow indicator
      ctx.fillStyle = '#00ff64';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('→', 60, 500);

      // Finish zone
      const finishGrad = ctx.createLinearGradient(FINISH_LINE, 50, WORLD_WIDTH, 50);
      finishGrad.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
      finishGrad.addColorStop(1, 'rgba(255, 215, 0, 0.4)');
      ctx.fillStyle = finishGrad;
      ctx.fillRect(FINISH_LINE, 50, WORLD_WIDTH - FINISH_LINE, WORLD_HEIGHT - 100);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px Arial';
      ctx.save();
      ctx.translate(WORLD_WIDTH - 30, WORLD_HEIGHT / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('🏆 FINISH 🏆', 0, 0);
      ctx.restore();

      // Draw my player (bull) with user's color
      const px = positionRef.current.x;
      const py = positionRef.current.y;
      
      // Glow effect
      ctx.shadowColor = bullColor;
      ctx.shadowBlur = 20;
      
      // Bull body
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
      
      // Nose ring
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      
      // Name tag
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(username, px, py - PLAYER_SIZE - 18);

      ctx.restore();

      // UI overlay (fixed position)
      if (gameState === 'racing') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvasSize.width/2 - 60, 10, 120, 40);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`⏱ ${raceTime}s`, canvasSize.width/2, 38);
        
        // Progress bar
        const progress = Math.min(1, positionRef.current.x / FINISH_LINE);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 55, canvasSize.width - 20, 8);
        ctx.fillStyle = '#00D4FF';
        ctx.fillRect(10, 55, (canvasSize.width - 20) * progress, 8);
        
        // Touch hint
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Drag to move', canvasSize.width/2, canvasSize.height - 10);
      }

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), canvasSize.width / 2, canvasSize.height / 2 + 30);
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#00D4FF';
        ctx.fillText('GET READY!', canvasSize.width / 2, canvasSize.height / 2 - 70);
      }

      requestAnimationFrame(render);
    };

    render();
  }, [myPosition, players, gameState, countdown, username, userId, isSinglePlayer, raceTime, canvasSize, bullColor]);

  const resetGame = async () => {
    setGameState('waiting');
    setFinishers([]);
    setRaceTime(0);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-3 py-3 flex items-center justify-between">
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

      <main className="container mx-auto px-2 py-3">
        <div className="text-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-gold bg-clip-text text-transparent mb-1">
            🐂 Bull Maze 🏆
          </h1>
          <p className="text-muted-foreground text-sm">
            Drag on screen or use arrow keys to navigate!
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Card className="p-2 bg-card/95 w-full max-w-[832px]">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="rounded-lg border-2 border-primary/30 w-full touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            
            <div className="mt-3 flex justify-center gap-3">
              {gameState === 'waiting' && (
                <>
                  <Button size="lg" onClick={() => startGame(true)} className="text-base px-5 bg-primary">
                    <Play className="w-5 h-5 mr-2" />
                    Solo Run
                  </Button>
                  <Button size="lg" onClick={() => startGame(false)} variant="outline" className="text-base px-5">
                    <Users className="w-5 h-5 mr-2" />
                    Multiplayer ({players.length})
                  </Button>
                </>
              )}
              
              {gameState === 'finished' && (
                <Button size="lg" onClick={resetGame} className="text-base px-5">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-3 bg-card/95 w-full max-w-[400px]">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Results
            </h2>
            
            {finishers.length > 0 ? (
              <div className="space-y-1">
                {finishers.map((fid, i) => {
                  const player = players.find(p => p.user_id === fid);
                  return (
                    <div key={fid} className={`p-2 rounded ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted/50'}`}>
                      <span className="font-bold">#{i + 1}</span> {player?.username || 'Player'}
                      {fid === userId && ' (You)'}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Complete the maze to see your time!</p>
            )}

            <div className="mt-3 p-2 bg-muted/30 rounded-lg text-xs">
              <p className="font-bold">💰 Prizes: Faster = More credits!</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BullStampede;
