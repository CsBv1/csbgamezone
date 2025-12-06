import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreditBar } from "@/components/CreditBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gem, Users, Gamepad2, ArrowUp, ArrowDown, ArrowLeftIcon, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  user_id: string;
  x: number;
  y: number;
  direction: string;
  color: string;
  username: string | null;
  is_online: boolean;
}

interface WorldDiamond {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface GamePortal {
  id: string;
  name: string;
  x: number;
  y: number;
  route: string;
  color: string;
  emoji: string;
}

// Optimized for smooth performance
const WORLD_WIDTH = 1400;
const WORLD_HEIGHT = 900;
const PLAYER_SIZE = 45;
const MOVE_SPEED = 6;
const DB_UPDATE_INTERVAL = 200; // Throttle DB updates

// Multiplayer Games Only - centered on the map
const GAME_PORTALS: GamePortal[] = [
  { id: 'mp-stampede', name: 'Bull Maze', x: 700, y: 400, route: '/games/bull-stampede', color: '#FF6B35', emoji: '🏃' },
];

export default function BullWorld() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [diamonds, setDiamonds] = useState<WorldDiamond[]>([]);
  const [myPosition, setMyPosition] = useState({ x: 700, y: 450 });
  const [myDirection, setMyDirection] = useState('down');
  const [myColor, setMyColor] = useState('#00D4FF');
  const [username, setUsername] = useState<string | null>(null);
  const [keys, setKeys] = useState(0);
  const [collectedDiamonds, setCollectedDiamonds] = useState(() => {
    // Load maze diamonds from sessionStorage on init
    return parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
  });
  const [isLoading, setIsLoading] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [nearPortal, setNearPortal] = useState<GamePortal | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const lastDbUpdate = useRef<number>(0);

  // Initialize user and game
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", description: "You need to be logged in to enter Bull World", variant: "destructive" });
        navigate('/');
        return;
      }
      setUserId(user.id);

      const [keysResult, profileResult, colorsResult] = await Promise.all([
        supabase.from('user_keys').select('balance').eq('user_id', user.id).single(),
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('user_colors').select('color_value').eq('user_id', user.id).eq('active', true).single()
      ]);

      const currentKeys = (keysResult.data as any)?.balance || 0;
      setKeys(currentKeys);
      setUsername((profileResult.data as any)?.username || 'Player');
      if ((colorsResult.data as any)?.color_value) {
        setMyColor((colorsResult.data as any).color_value);
      }

      // Only charge key on FIRST entry this session
      const hasAccess = sessionStorage.getItem('bullWorldAccess') === 'true';
      
      if (!hasAccess) {
        if (currentKeys < 1) {
          toast({ title: "No Keys", description: "You need 1 key to enter Bull World", variant: "destructive" });
          navigate('/');
          return;
        }
        await supabase.from('user_keys').update({ balance: currentKeys - 1 }).eq('user_id', user.id);
        setKeys(currentKeys - 1);
        sessionStorage.setItem('bullWorldAccess', 'true');
      }

      await joinWorld(user.id, (profileResult.data as any)?.username, (colorsResult.data as any)?.color_value || '#00D4FF');
      setGameActive(true);
      setIsLoading(false);
    };
    init();

    // Refresh collected diamonds when returning from games
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const mazeDiamonds = parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
        setCollectedDiamonds(mazeDiamonds);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also check on mount in case we're returning from navigation
    const mazeDiamonds = parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
    if (mazeDiamonds > 0) setCollectedDiamonds(mazeDiamonds);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (userId) leaveWorld();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const joinWorld = async (uid: string, uname: string | null, color: string) => {
    const { data: existing } = await supabase
      .from('world_players')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (existing) {
      await supabase
        .from('world_players')
        .update({ is_online: true, color, username: uname, last_seen: new Date().toISOString() })
        .eq('user_id', uid);
      setMyPosition({ x: (existing as any).x, y: (existing as any).y });
    } else {
      const startX = 600 + Math.random() * 200;
      const startY = 350 + Math.random() * 200;
      await supabase.from('world_players').insert({
        user_id: uid,
        x: startX,
        y: startY,
        color,
        username: uname
      });
      setMyPosition({ x: startX, y: startY });
    }

    spawnDiamonds();
  };

  const leaveWorld = async () => {
    if (!userId) return;
    await supabase
      .from('world_players')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('user_id', userId);
  };

  const spawnDiamonds = async () => {
    const { data: existing } = await supabase
      .from('world_diamonds')
      .select('*')
      .is('collected_by', null);

    if (!existing || existing.length < 15) {
      const newItems = [];
      for (let i = 0; i < 15 - (existing?.length || 0); i++) {
        const isGold = Math.random() > 0.75;
        newItems.push({
          x: 80 + Math.random() * (WORLD_WIDTH - 160),
          y: 80 + Math.random() * (WORLD_HEIGHT - 160),
          value: isGold ? Math.floor(Math.random() * 4) + 5 : Math.floor(Math.random() * 2) + 1
        });
      }
      if (newItems.length > 0) {
        await supabase.from('world_diamonds').insert(newItems);
      }
    }
  };

  // Realtime subscriptions
  useEffect(() => {
    if (!gameActive) return;

    const playersChannel = supabase
      .channel('world-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_players' }, fetchPlayers)
      .subscribe();

    const diamondsChannel = supabase
      .channel('world-diamonds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_diamonds' }, fetchDiamonds)
      .subscribe();

    fetchPlayers();
    fetchDiamonds();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(diamondsChannel);
    };
  }, [gameActive]);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('world_players').select('*').eq('is_online', true);
    if (data) setPlayers(data as Player[]);
  };

  const fetchDiamonds = async () => {
    const { data } = await supabase.from('world_diamonds').select('*').is('collected_by', null);
    if (data) setDiamonds(data as WorldDiamond[]);
  };

  // Movement controls
  useEffect(() => {
    if (!gameActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key.toLowerCase());
        
        // Enter portal on space
        if (e.key === ' ' && nearPortal) {
          enterPortal(nearPortal);
        }
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
  }, [gameActive, nearPortal]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !userId) return;

    const gameLoop = setInterval(() => {
      if (!document.hasFocus()) return; // Skip when tab not focused
      let dx = 0, dy = 0;
      let newDirection = myDirection;

      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) { dy = -MOVE_SPEED; newDirection = 'up'; }
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) { dy = MOVE_SPEED; newDirection = 'down'; }
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) { dx = -MOVE_SPEED; newDirection = 'left'; }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) { dx = MOVE_SPEED; newDirection = 'right'; }

      if (dx !== 0 || dy !== 0) {
        setMyPosition(prev => {
          const newX = Math.max(35, Math.min(WORLD_WIDTH - 35, prev.x + dx));
          const newY = Math.max(35, Math.min(WORLD_HEIGHT - 35, prev.y + dy));
          
          // Throttle database updates for performance
          const now = Date.now();
          if (now - lastDbUpdate.current > DB_UPDATE_INTERVAL) {
            lastDbUpdate.current = now;
            supabase
              .from('world_players')
              .update({ x: newX, y: newY, direction: newDirection, last_seen: new Date().toISOString() })
              .eq('user_id', userId);
          }

          return { x: newX, y: newY };
        });
        setMyDirection(newDirection);
      }

      // Check diamond collection
      diamonds.forEach(diamond => {
        const dist = Math.hypot(myPosition.x - diamond.x, myPosition.y - diamond.y);
        if (dist < 45) collectDiamond(diamond);
      });

      // Check portal proximity
      let foundPortal: GamePortal | null = null;
      GAME_PORTALS.forEach(portal => {
        const dist = Math.hypot(myPosition.x - portal.x, myPosition.y - portal.y);
        if (dist < 70) foundPortal = portal;
      });
      setNearPortal(foundPortal);
    }, 33); // ~30fps for smooth movement

    return () => clearInterval(gameLoop);
  }, [gameActive, userId, myPosition, diamonds, myDirection]);

  const collectDiamond = async (diamond: WorldDiamond) => {
    if (!userId) return;
    
    const { error } = await supabase
      .from('world_diamonds')
      .update({ collected_by: userId, collected_at: new Date().toISOString() })
      .eq('id', diamond.id)
      .is('collected_by', null);

    if (!error) {
      setCollectedDiamonds(prev => prev + diamond.value);
      const isGold = diamond.value >= 5;
      toast({ title: `+${diamond.value} ${isGold ? '🪙' : '💎'}`, description: isGold ? "Gold collected!" : "Diamond collected!" });
      
      const { data: current } = await supabase
        .from('user_diamonds')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      
      if (current) {
        await supabase
          .from('user_diamonds')
          .update({ 
            balance: ((current as any).balance || 0) + diamond.value,
            total_earned: ((current as any).total_earned || 0) + diamond.value
          })
          .eq('user_id', userId);
      }

      setTimeout(spawnDiamonds, 3000);
    }
  };

  const enterPortal = (portal: GamePortal) => {
    sessionStorage.setItem('bullWorldAccess', 'true');
    sessionStorage.setItem('fromBullWorld', 'true');
    leaveWorld();
    navigate(portal.route);
  };

  const handleMobileMove = (direction: string) => {
    let dx = 0, dy = 0;
    if (direction === 'up') dy = -MOVE_SPEED * 2;
    if (direction === 'down') dy = MOVE_SPEED * 2;
    if (direction === 'left') dx = -MOVE_SPEED * 2;
    if (direction === 'right') dx = MOVE_SPEED * 2;

    setMyPosition(prev => {
      const newX = Math.max(40, Math.min(WORLD_WIDTH - 40, prev.x + dx));
      const newY = Math.max(40, Math.min(WORLD_HEIGHT - 40, prev.y + dy));
      
      if (userId) {
        supabase
          .from('world_players')
          .update({ x: newX, y: newY, direction, last_seen: new Date().toISOString() })
          .eq('user_id', userId);
      }

      return { x: newX, y: newY };
    });
    setMyDirection(direction);
  };

  // Canvas rendering - Cardano Stake Bulls Theme
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear and draw Cardano-themed background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      bgGradient.addColorStop(0, '#0a1628');
      bgGradient.addColorStop(0.5, '#0d2137');
      bgGradient.addColorStop(1, '#061018');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Cardano hex grid pattern (3D effect)
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      const hexSize = 60;
      for (let row = 0; row < WORLD_HEIGHT / hexSize + 1; row++) {
        for (let col = 0; col < WORLD_WIDTH / hexSize + 1; col++) {
          const x = col * hexSize * 1.5;
          const y = row * hexSize * 1.732 + (col % 2) * hexSize * 0.866;
          drawHexagon(ctx, x, y, hexSize * 0.5);
        }
      }

      // Glowing paths between portals (simplified)
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      [180, 450, 720].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(120, y);
        ctx.lineTo(1030, y);
        ctx.stroke();
      });
      [200, 450, 700, 950].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.lineTo(x, 800);
        ctx.stroke();
      });

      // Inner path glow
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
      ctx.lineWidth = 6;
      [180, 450, 720].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(120, y);
        ctx.lineTo(1030, y);
        ctx.stroke();
      });
      [200, 450, 700, 950].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.lineTo(x, 800);
        ctx.stroke();
      });

      // Draw floating particles (stars) - reduced for performance
      const time = Date.now() / 1000;
      for (let i = 0; i < 15; i++) {
        const px = (i * 97 + time * 8) % WORLD_WIDTH;
        const py = (i * 67 + Math.sin(time + i) * 15) % WORLD_HEIGHT;
        ctx.fillStyle = 'rgba(0, 212, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw game portals with 3D effect
      GAME_PORTALS.forEach(portal => {
        const isNear = nearPortal?.id === portal.id;
        const pulseScale = isNear ? 1 + Math.sin(time * 4) * 0.1 : 1;
        
        // Portal outer glow
        const glowGradient = ctx.createRadialGradient(portal.x, portal.y, 0, portal.x, portal.y, 80 * pulseScale);
        glowGradient.addColorStop(0, portal.color + '60');
        glowGradient.addColorStop(0.6, portal.color + '20');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(portal.x - 100, portal.y - 100, 200, 200);

        // Portal 3D base (shadow)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(portal.x + 5, portal.y + 50, 55 * pulseScale, 20 * pulseScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Portal 3D platform
        ctx.fillStyle = '#1a3a4a';
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y + 40, 55 * pulseScale, 20 * pulseScale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Portal ring
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = isNear ? 6 : 4;
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y, 50 * pulseScale, 35 * pulseScale, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Portal inner
        const innerGrad = ctx.createRadialGradient(portal.x, portal.y - 10, 0, portal.x, portal.y, 45);
        innerGrad.addColorStop(0, portal.color + 'CC');
        innerGrad.addColorStop(0.7, portal.color + '66');
        innerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y, 45 * pulseScale, 30 * pulseScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Portal emoji
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(portal.emoji, portal.x, portal.y + 12);

        // Portal name
        ctx.fillStyle = '#fff';
        ctx.font = isNear ? 'bold 16px Arial' : '14px Arial';
        ctx.shadowColor = portal.color;
        ctx.shadowBlur = isNear ? 10 : 5;
        ctx.fillText(portal.name, portal.x, portal.y + 75);
        ctx.shadowBlur = 0;

        // MULTIPLAYER badge for MP games (top row)
        if (portal.id.startsWith('mp-')) {
          ctx.fillStyle = '#00FF88';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('👥 MULTIPLAYER', portal.x, portal.y - 55);
        }

        // "Press SPACE" indicator
        if (isNear) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 12px Arial';
          ctx.fillText('PRESS SPACE', portal.x, portal.y + 92);
        }
      });

      // Draw diamonds and coins with glow
      diamonds.forEach(diamond => {
        const isGold = diamond.value >= 5;
        const pulse = 1 + Math.sin(time * 3 + diamond.x) * 0.15;
        
        // Glow
        const gemGlow = ctx.createRadialGradient(diamond.x, diamond.y, 0, diamond.x, diamond.y, 30 * pulse);
        gemGlow.addColorStop(0, isGold ? 'rgba(255,215,0,0.5)' : 'rgba(0,212,255,0.5)');
        gemGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = gemGlow;
        ctx.beginPath();
        ctx.arc(diamond.x, diamond.y, 30 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isGold ? '🪙' : '💎', diamond.x, diamond.y + 10);
        
        // Value
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.shadowColor = isGold ? '#FFD700' : '#00D4FF';
        ctx.shadowBlur = 4;
        ctx.fillText(`+${diamond.value}`, diamond.x, diamond.y + 35);
        ctx.shadowBlur = 0;
      });

      // Draw other players
      players.forEach(player => {
        if (player.user_id === userId) return;
        drawStakeBull(ctx, player.x, player.y, player.color, player.direction, player.username, false);
      });

      // Draw current player
      drawStakeBull(ctx, myPosition.x, myPosition.y, myColor, myDirection, username, true);

      // Draw border frame
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, WORLD_WIDTH - 16, WORLD_HEIGHT - 16);
      
      // Corner decorations
      const corners = [[16, 16], [WORLD_WIDTH - 16, 16], [16, WORLD_HEIGHT - 16], [WORLD_WIDTH - 16, WORLD_HEIGHT - 16]];
      corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#00D4FF';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameActive, players, diamonds, myPosition, myDirection, myColor, username, userId, nearPortal]);

  const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const drawStakeBull = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, direction: string, name: string | null, isMe: boolean) => {
    const scale = 1.8;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 30 * scale, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body with gradient
    const bodyGrad = ctx.createRadialGradient(x - 10, y - 10, 0, x, y, 30 * scale);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(1, shadeColor(color, -30));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 25 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 10, 10 * scale, 6 * scale, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headOffsetX = direction === 'left' ? -12 : direction === 'right' ? 12 : 0;
    const headOffsetY = direction === 'up' ? -10 : direction === 'down' ? 10 : -5;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + headOffsetX * 0.5, y + headOffsetY * 0.5 - 8, 14 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = shadeColor(color, 20);
    ctx.beginPath();
    ctx.ellipse(x + headOffsetX * 0.3, y + headOffsetY * 0.3 + 8, 9 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x - 4, y + 10, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 4, y + 10, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns - Cardano blue glow
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 18);
    ctx.quadraticCurveTo(x - 25, y - 35, x - 20, y - 48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 18);
    ctx.quadraticCurveTo(x + 25, y - 35, x + 20, y - 48);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Horn tips
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 21, y - 44);
    ctx.lineTo(x - 20, y - 48);
    ctx.moveTo(x + 21, y - 44);
    ctx.lineTo(x + 20, y - 48);
    ctx.stroke();

    // Ears
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x - 18, y - 12, 6, 4, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + 18, y - 12, 6, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 7, y - 12, 5, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 12, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 7, y - 12, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 8, y - 13, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 13, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose ring
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x, y + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Name tag
    ctx.font = isMe ? 'bold 14px Arial' : '12px Arial';
    ctx.textAlign = 'center';
    const nameText = name || 'Player';
    const nameWidth = ctx.measureText(nameText).width + 16;
    
    // Name background
    ctx.fillStyle = isMe ? 'rgba(0, 212, 255, 0.9)' : 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = isMe ? '#00D4FF' : '#475569';
    ctx.lineWidth = 2;
    
    const nameY = y - 65;
    ctx.beginPath();
    ctx.roundRect(x - nameWidth / 2, nameY - 8, nameWidth, 20, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isMe ? '#000' : '#fff';
    ctx.fillText(nameText, x, nameY + 6);

    // Online indicator
    if (isMe) {
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + nameWidth / 2 - 4, nameY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  const shadeColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Card className="p-8 text-center bg-[#0d2137] border-[#00D4FF]/30">
          <div className="animate-spin w-12 h-12 border-4 border-[#00D4FF] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-[#00D4FF]">Entering Stake Bulls World...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#00D4FF] hover:bg-[#00D4FF]/10" onClick={() => { leaveWorld(); navigate('/'); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit World
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00D4FF] via-[#0095ff] to-[#00D4FF] bg-clip-text text-transparent">
            🐂 Cardano Stake Bulls World 🌍
          </h1>
          <p className="text-[#00D4FF]/60">Compete with friends in Maze & Win Diamonds With Cardano Stake Bulls Community</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-4">
          <Card className="px-4 py-2 flex items-center gap-2 bg-[#0d2137] border-[#00D4FF]/30">
            <Users className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-white">{players.length} Online</span>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-2 bg-[#0d2137] border-[#00D4FF]/30">
            <Gem className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-white">+{collectedDiamonds} Collected</span>
          </Card>
        </div>

        {/* Game Canvas */}
        <Card className="p-2 mb-4 overflow-hidden bg-[#0d2137] border-[#00D4FF]/30">
          <canvas
            ref={canvasRef}
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            className="w-full rounded-lg"
            style={{ maxHeight: '65vh' }}
          />
        </Card>

        {/* Mobile Controls */}
        <Card className="p-4 md:hidden bg-[#0d2137] border-[#00D4FF]/30">
          <h3 className="font-bold mb-3 text-center text-white">Mobile Controls</h3>
          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#00D4FF] text-[#00D4FF]" onTouchStart={() => handleMobileMove('up')}>
              <ArrowUp className="w-6 h-6" />
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#00D4FF] text-[#00D4FF]" onTouchStart={() => handleMobileMove('left')}>
                <ArrowLeftIcon className="w-6 h-6" />
              </Button>
              <div className="w-14 h-14" />
              <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#00D4FF] text-[#00D4FF]" onTouchStart={() => handleMobileMove('right')}>
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
            <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#00D4FF] text-[#00D4FF]" onTouchStart={() => handleMobileMove('down')}>
              <ArrowDown className="w-6 h-6" />
            </Button>
          </div>
          {nearPortal && (
            <Button className="w-full mt-4 bg-[#00D4FF] text-black hover:bg-[#00D4FF]/80" onClick={() => enterPortal(nearPortal)}>
              Enter {nearPortal.name}
            </Button>
          )}
        </Card>

        {/* Desktop Controls */}
        <Card className="p-4 hidden md:block bg-[#0d2137] border-[#00D4FF]/30">
          <h3 className="font-bold mb-2 text-white">Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-white/80">
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#00D4FF]">↑ W</kbd> Up</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#00D4FF]">↓ S</kbd> Down</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#00D4FF]">← A</kbd> Left</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#00D4FF]">→ D</kbd> Right</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#00D4FF]">SPACE</kbd> Enter Portal</div>
          </div>
        </Card>

        <p className="text-[#00D4FF]/60 text-sm text-center mt-4">
          <Gamepad2 className="w-4 h-4 inline mr-1" />
          Walk to a portal and press SPACE to play (FREE inside Bull World)! Collect 💎 and 🪙!
        </p>

        {/* Quick Portal Access */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-4">
          {GAME_PORTALS.map(portal => (
            <Button
              key={portal.id}
              variant="outline"
              className="border-2 text-white hover:text-black"
              style={{ borderColor: portal.color, backgroundColor: 'transparent' }}
              onClick={() => enterPortal(portal)}
            >
              {portal.emoji} {portal.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
