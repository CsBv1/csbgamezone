import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreditBar } from "@/components/CreditBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gem, Users, ArrowUp, ArrowDown, ArrowLeftIcon, ArrowRight, Hammer, Pickaxe, Factory, Store } from "lucide-react";
import { WorldChat } from "@/components/WorldChat";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/hooks/useAudioManager";

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

interface CityDiamond {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  emoji: string;
  type: 'mine' | 'forge' | 'market' | 'bank' | 'tavern' | 'tower' | 'decoration';
  reward?: number;
  cooldownMs?: number;
}

const CITY_WIDTH = 2400;
const CITY_HEIGHT = 1600;
const PLAYER_SIZE = 45;
const MOVE_SPEED = 7;
const DB_UPDATE_INTERVAL = 200;

const BUILDINGS: Building[] = [
  // Work buildings - earn diamonds
  { id: 'diamond-mine', name: 'Diamond Mine', x: 300, y: 300, width: 160, height: 120, color: '#00D4FF', emoji: '⛏️', type: 'mine', reward: 5, cooldownMs: 10000 },
  { id: 'gold-forge', name: 'Gold Forge', x: 800, y: 250, width: 140, height: 110, color: '#FFD700', emoji: '🔥', type: 'forge', reward: 8, cooldownMs: 15000 },
  { id: 'crystal-lab', name: 'Crystal Lab', x: 1500, y: 350, width: 150, height: 120, color: '#9933FF', emoji: '🔮', type: 'forge', reward: 10, cooldownMs: 20000 },
  { id: 'gem-quarry', name: 'Gem Quarry', x: 2000, y: 500, width: 160, height: 120, color: '#FF6B35', emoji: '💎', type: 'mine', reward: 6, cooldownMs: 12000 },
  { id: 'stake-factory', name: 'Stake Factory', x: 400, y: 900, width: 180, height: 130, color: '#00FF88', emoji: '🏭', type: 'forge', reward: 12, cooldownMs: 25000 },
  { id: 'bull-bank', name: 'Bull Bank', x: 1200, y: 800, width: 160, height: 130, color: '#FFD700', emoji: '🏦', type: 'bank', reward: 15, cooldownMs: 30000 },
  // Social buildings
  { id: 'tavern', name: 'Bull Tavern', x: 1800, y: 900, width: 150, height: 110, color: '#FF4444', emoji: '🍺', type: 'tavern' },
  { id: 'market', name: 'City Market', x: 600, y: 1200, width: 180, height: 120, color: '#44FF44', emoji: '🏪', type: 'market' },
  // Decorative
  { id: 'tower1', name: 'Watch Tower', x: 100, y: 100, width: 80, height: 100, color: '#667788', emoji: '🗼', type: 'tower' },
  { id: 'tower2', name: 'Clock Tower', x: 2200, y: 100, width: 80, height: 100, color: '#667788', emoji: '🕐', type: 'tower' },
  { id: 'tower3', name: 'Guard Tower', x: 100, y: 1400, width: 80, height: 100, color: '#667788', emoji: '🏰', type: 'tower' },
  { id: 'tower4', name: 'Beacon Tower', x: 2200, y: 1400, width: 80, height: 100, color: '#667788', emoji: '🔦', type: 'tower' },
  { id: 'fountain', name: 'City Fountain', x: 1100, y: 1100, width: 120, height: 120, color: '#00BBFF', emoji: '⛲', type: 'decoration' },
  { id: 'statue', name: 'Bull Statue', x: 1800, y: 400, width: 100, height: 100, color: '#C0C0C0', emoji: '🐂', type: 'decoration' },
  { id: 'park', name: 'City Park', x: 1400, y: 1300, width: 200, height: 140, color: '#228B22', emoji: '🌳', type: 'decoration' },
];

// Roads layout
const ROADS = [
  { x1: 0, y1: 200, x2: CITY_WIDTH, y2: 200, width: 60 },
  { x1: 0, y1: 700, x2: CITY_WIDTH, y2: 700, width: 60 },
  { x1: 0, y1: 1200, x2: CITY_WIDTH, y2: 1200, width: 60 },
  { x1: 250, y1: 0, x2: 250, y2: CITY_HEIGHT, width: 60 },
  { x1: 900, y1: 0, x2: 900, y2: CITY_HEIGHT, width: 60 },
  { x1: 1500, y1: 0, x2: 1500, y2: CITY_HEIGHT, width: 60 },
  { x1: 2100, y1: 0, x2: 2100, y2: CITY_HEIGHT, width: 60 },
];

export default function BullCity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [diamonds, setDiamonds] = useState<CityDiamond[]>([]);
  const [myPosition, setMyPosition] = useState({ x: 1200, y: 800 });
  const [myDirection, setMyDirection] = useState('down');
  const [myColor, setMyColor] = useState('#00D4FF');
  const [username, setUsername] = useState<string | null>(null);
  const [collectedDiamonds, setCollectedDiamonds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [nearBuilding, setNearBuilding] = useState<Building | null>(null);
  const [workCooldowns, setWorkCooldowns] = useState<Record<string, number>>({});
  const [isWorking, setIsWorking] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const keysPressed = useRef<Set<string>>(new Set());
  const lastDbUpdate = useRef<number>(0);
  const posRef = useRef({ x: 1200, y: 800 });

  // Canvas viewport size
  const VIEWPORT_W = 1400;
  const VIEWPORT_H = 900;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", description: "You need to be logged in to enter Bull City", variant: "destructive" });
        navigate('/');
        return;
      }
      setUserId(user.id);

      const [profileResult, colorsResult] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('user_colors').select('color_value').eq('user_id', user.id).eq('active', true).single()
      ]);

      setUsername((profileResult.data as any)?.username || 'Player');
      if ((colorsResult.data as any)?.color_value) {
        setMyColor((colorsResult.data as any).color_value);
      }

      // Free entry from Bull World
      await joinCity(user.id, (profileResult.data as any)?.username, (colorsResult.data as any)?.color_value || '#00D4FF');
      setGameActive(true);
      setIsLoading(false);
    };
    init();

    return () => {
      if (userId) leaveCity();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const joinCity = async (uid: string, uname: string | null, color: string) => {
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
      // Start in city center
      setMyPosition({ x: 1200, y: 800 });
      posRef.current = { x: 1200, y: 800 };
    } else {
      await supabase.from('world_players').insert({
        user_id: uid,
        x: 1200,
        y: 800,
        color,
        username: uname
      });
      setMyPosition({ x: 1200, y: 800 });
      posRef.current = { x: 1200, y: 800 };
    }

    spawnCityDiamonds();
  };

  const leaveCity = async () => {
    if (!userId) return;
    await supabase
      .from('world_players')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('user_id', userId);
  };

  const spawnCityDiamonds = async () => {
    const { data: existing } = await supabase
      .from('world_diamonds')
      .select('*')
      .is('collected_by', null);

    if (!existing || existing.length < 30) {
      const newItems = [];
      for (let i = 0; i < 30 - (existing?.length || 0); i++) {
        const isGold = Math.random() > 0.7;
        newItems.push({
          x: 80 + Math.random() * (CITY_WIDTH - 160),
          y: 80 + Math.random() * (CITY_HEIGHT - 160),
          value: isGold ? Math.floor(Math.random() * 8) + 5 : Math.floor(Math.random() * 3) + 1
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
      .channel('city-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_players' }, fetchPlayers)
      .subscribe();

    const diamondsChannel = supabase
      .channel('city-diamonds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_diamonds' }, fetchDiamonds)
      .subscribe();

    fetchPlayers();
    fetchDiamonds();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(diamondsChannel);
    };
  }, [gameActive, userId]);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('world_players').select('*').eq('is_online', true);
    if (data) setPlayers(data as Player[]);
  };

  const fetchDiamonds = async () => {
    const { data } = await supabase.from('world_diamonds').select('*').is('collected_by', null);
    if (data) setDiamonds(data as CityDiamond[]);
  };

  // Movement controls
  useEffect(() => {
    if (!gameActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'e'].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key.toLowerCase());
        
        if ((e.key === ' ' || e.key === 'e') && nearBuilding && nearBuilding.reward) {
          workAtBuilding(nearBuilding);
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
  }, [gameActive, nearBuilding]);

  const workAtBuilding = async (building: Building) => {
    if (!userId || !building.reward || isWorking) return;
    
    const now = Date.now();
    const lastWork = workCooldowns[building.id] || 0;
    if (now - lastWork < (building.cooldownMs || 10000)) {
      const remaining = Math.ceil(((building.cooldownMs || 10000) - (now - lastWork)) / 1000);
      toast({ title: "⏳ Cooldown", description: `Wait ${remaining}s to work here again` });
      return;
    }

    setIsWorking(true);
    setWorkCooldowns(prev => ({ ...prev, [building.id]: now }));

    // Simulate work animation delay
    await new Promise(r => setTimeout(r, 1500));

    try {
      const { data: current } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (current) {
        const reward = building.reward;
        await supabase
          .from('user_diamonds' as any)
          .update({
            balance: ((current as any).balance || 0) + reward,
            total_earned: ((current as any).total_earned || 0) + reward
          })
          .eq('user_id', userId);

        // Record game result
        await supabase
          .from('game_results' as any)
          .insert({
            user_id: userId,
            game_name: `bull-city-${building.id}`,
            result: 'win',
            diamonds_won: reward,
            multiplier: 1
          });

        setCollectedDiamonds(prev => prev + reward);
        toast({ title: `${building.emoji} +${reward} 💎`, description: `Earned diamonds at ${building.name}!` });
        audioManager.playSFX('win');
      }
    } catch (error) {
      console.error('Work error:', error);
    } finally {
      setIsWorking(false);
    }
  };

  // Game loop
  useEffect(() => {
    if (!gameActive || !userId) return;

    const gameLoop = setInterval(() => {
      if (!document.hasFocus()) return;
      let dx = 0, dy = 0;
      let newDirection = myDirection;

      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) { dy = -MOVE_SPEED; newDirection = 'up'; }
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) { dy = MOVE_SPEED; newDirection = 'down'; }
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) { dx = -MOVE_SPEED; newDirection = 'left'; }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) { dx = MOVE_SPEED; newDirection = 'right'; }

      if (dx !== 0 || dy !== 0) {
        const newX = Math.max(35, Math.min(CITY_WIDTH - 35, posRef.current.x + dx));
        const newY = Math.max(35, Math.min(CITY_HEIGHT - 35, posRef.current.y + dy));
        posRef.current = { x: newX, y: newY };
        setMyPosition({ x: newX, y: newY });
        setMyDirection(newDirection);

        // Update camera
        setCameraOffset({
          x: Math.max(0, Math.min(CITY_WIDTH - VIEWPORT_W, newX - VIEWPORT_W / 2)),
          y: Math.max(0, Math.min(CITY_HEIGHT - VIEWPORT_H, newY - VIEWPORT_H / 2))
        });

        const now = Date.now();
        if (now - lastDbUpdate.current > DB_UPDATE_INTERVAL) {
          lastDbUpdate.current = now;
          supabase
            .from('world_players')
            .update({ x: newX, y: newY, direction: newDirection, last_seen: new Date().toISOString() })
            .eq('user_id', userId);
        }
      }

      // Check diamond collection
      diamonds.forEach(diamond => {
        const dist = Math.hypot(posRef.current.x - diamond.x, posRef.current.y - diamond.y);
        if (dist < 45) collectDiamond(diamond);
      });

      // Check building proximity
      let foundBuilding: Building | null = null;
      BUILDINGS.forEach(b => {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const dist = Math.hypot(posRef.current.x - cx, posRef.current.y - cy);
        if (dist < 100) foundBuilding = b;
      });
      setNearBuilding(foundBuilding);
    }, 33);

    return () => clearInterval(gameLoop);
  }, [gameActive, userId, diamonds, myDirection]);

  const collectDiamond = async (diamond: CityDiamond) => {
    if (!userId) return;
    
    const { error } = await supabase
      .from('world_diamonds')
      .update({ collected_by: userId, collected_at: new Date().toISOString() })
      .eq('id', diamond.id)
      .is('collected_by', null);

    if (!error) {
      setCollectedDiamonds(prev => prev + diamond.value);
      toast({ title: `+${diamond.value} 💎`, description: "Diamond collected!" });
      
      const { data: current } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();
      
      if (current) {
        await supabase
          .from('user_diamonds' as any)
          .update({ 
            balance: ((current as any).balance || 0) + diamond.value,
            total_earned: ((current as any).total_earned || 0) + diamond.value
          })
          .eq('user_id', userId);
      }

      setTimeout(spawnCityDiamonds, 5000);
    }
  };

  const handleMobileMove = (direction: string) => {
    let dx = 0, dy = 0;
    if (direction === 'up') dy = -MOVE_SPEED * 2;
    if (direction === 'down') dy = MOVE_SPEED * 2;
    if (direction === 'left') dx = -MOVE_SPEED * 2;
    if (direction === 'right') dx = MOVE_SPEED * 2;

    const newX = Math.max(40, Math.min(CITY_WIDTH - 40, posRef.current.x + dx));
    const newY = Math.max(40, Math.min(CITY_HEIGHT - 40, posRef.current.y + dy));
    posRef.current = { x: newX, y: newY };
    setMyPosition({ x: newX, y: newY });
    setMyDirection(direction);

    setCameraOffset({
      x: Math.max(0, Math.min(CITY_WIDTH - VIEWPORT_W, newX - VIEWPORT_W / 2)),
      y: Math.max(0, Math.min(CITY_HEIGHT - VIEWPORT_H, newY - VIEWPORT_H / 2))
    });

    if (userId) {
      supabase
        .from('world_players')
        .update({ x: newX, y: newY, direction, last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    }
  };

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);
      ctx.translate(-cameraOffset.x, -cameraOffset.y);

      // City background - dark with grid
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CITY_HEIGHT);
      bgGrad.addColorStop(0, '#0b1a2e');
      bgGrad.addColorStop(0.5, '#0d2640');
      bgGrad.addColorStop(1, '#071420');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CITY_WIDTH, CITY_HEIGHT);

      // Grid pattern
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CITY_WIDTH; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CITY_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < CITY_HEIGHT; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CITY_WIDTH, y); ctx.stroke();
      }

      // Roads
      ROADS.forEach(road => {
        ctx.fillStyle = 'rgba(40, 60, 80, 0.8)';
        if (road.x1 === road.x2) {
          // Vertical
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
          // Road lines
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 15]);
          ctx.beginPath(); ctx.moveTo(road.x1, road.y1); ctx.lineTo(road.x1, road.y2); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Horizontal
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 15]);
          ctx.beginPath(); ctx.moveTo(road.x1, road.y1); ctx.lineTo(road.x2, road.y1); ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Floating particles
      const time = Date.now() / 1000;
      for (let i = 0; i < 30; i++) {
        const px = (i * 83 + time * 5) % CITY_WIDTH;
        const py = (i * 57 + Math.sin(time + i * 0.7) * 20) % CITY_HEIGHT;
        ctx.fillStyle = 'rgba(0, 212, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw buildings
      BUILDINGS.forEach(building => {
        const cx = building.x + building.width / 2;
        const cy = building.y + building.height / 2;
        const isNear = nearBuilding?.id === building.id;
        
        // Building shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(building.x + 8, building.y + 8, building.width, building.height);

        // Building base
        const bGrad = ctx.createLinearGradient(building.x, building.y, building.x, building.y + building.height);
        bGrad.addColorStop(0, building.color + '99');
        bGrad.addColorStop(1, building.color + '44');
        ctx.fillStyle = bGrad;
        ctx.fillRect(building.x, building.y, building.width, building.height);

        // Building border
        ctx.strokeStyle = isNear ? '#FFD700' : building.color;
        ctx.lineWidth = isNear ? 4 : 2;
        ctx.strokeRect(building.x, building.y, building.width, building.height);

        // Glow effect for work buildings
        if (building.reward && isNear) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 20;
          ctx.strokeRect(building.x, building.y, building.width, building.height);
          ctx.shadowBlur = 0;
        }

        // Roof
        ctx.fillStyle = building.color + 'CC';
        ctx.beginPath();
        ctx.moveTo(building.x - 10, building.y);
        ctx.lineTo(cx, building.y - 30);
        ctx.lineTo(building.x + building.width + 10, building.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = building.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Windows
        const windowCount = Math.floor(building.width / 40);
        for (let w = 0; w < windowCount; w++) {
          const wx = building.x + 20 + w * 40;
          const wy = building.y + 30;
          ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
          ctx.fillRect(wx, wy, 20, 20);
          ctx.strokeStyle = building.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, 20, 20);
          // Window cross
          ctx.beginPath();
          ctx.moveTo(wx + 10, wy); ctx.lineTo(wx + 10, wy + 20);
          ctx.moveTo(wx, wy + 10); ctx.lineTo(wx + 20, wy + 10);
          ctx.stroke();
        }

        // Door
        ctx.fillStyle = 'rgba(100, 60, 20, 0.9)';
        ctx.fillRect(cx - 12, building.y + building.height - 35, 24, 35);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 12, building.y + building.height - 35, 24, 35);

        // Emoji on roof
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(building.emoji, cx, building.y - 5);

        // Building name
        ctx.fillStyle = '#fff';
        ctx.font = isNear ? 'bold 14px Arial' : '12px Arial';
        ctx.shadowColor = building.color;
        ctx.shadowBlur = isNear ? 8 : 4;
        ctx.fillText(building.name, cx, building.y + building.height + 18);
        ctx.shadowBlur = 0;

        // Work indicator
        if (building.reward && isNear) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(`⚡ PRESS E/SPACE (+${building.reward} 💎)`, cx, building.y + building.height + 35);

          const cooldownLeft = workCooldowns[building.id] ? 
            Math.max(0, (building.cooldownMs || 10000) - (Date.now() - workCooldowns[building.id])) : 0;
          if (cooldownLeft > 0) {
            ctx.fillStyle = '#FF6666';
            ctx.fillText(`⏳ ${Math.ceil(cooldownLeft / 1000)}s`, cx, building.y + building.height + 50);
          }
        }

        // Type badge
        if (building.reward) {
          ctx.fillStyle = '#00FF88';
          ctx.font = 'bold 9px Arial';
          ctx.fillText('💰 WORK HERE', cx, building.y - 35);
        }
      });

      // Draw diamonds
      diamonds.forEach(diamond => {
        const isGold = diamond.value >= 5;
        const pulse = 1 + Math.sin(time * 3 + diamond.x) * 0.15;
        
        const gemGlow = ctx.createRadialGradient(diamond.x, diamond.y, 0, diamond.x, diamond.y, 25 * pulse);
        gemGlow.addColorStop(0, isGold ? 'rgba(255,215,0,0.5)' : 'rgba(0,212,255,0.5)');
        gemGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = gemGlow;
        ctx.beginPath();
        ctx.arc(diamond.x, diamond.y, 25 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isGold ? '🪙' : '💎', diamond.x, diamond.y + 8);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.shadowColor = isGold ? '#FFD700' : '#00D4FF';
        ctx.shadowBlur = 4;
        ctx.fillText(`+${diamond.value}`, diamond.x, diamond.y + 28);
        ctx.shadowBlur = 0;
      });

      // Draw other players
      players.forEach(player => {
        if (player.user_id === userId) return;
        drawBull(ctx, player.x, player.y, player.color, player.direction, player.username, false);
      });

      // Draw current player
      drawBull(ctx, myPosition.x, myPosition.y, myColor, myDirection, username, true);

      // Working animation
      if (isWorking) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(myPosition.x, myPosition.y, 60 + Math.sin(time * 8) * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚒️', myPosition.x, myPosition.y - 80);
      }

      // Border
      ctx.strokeStyle = 'rgba(255, 153, 0, 0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, CITY_WIDTH - 8, CITY_HEIGHT - 8);

      ctx.restore();

      // Minimap
      const mmW = 180, mmH = 120;
      const mmX = VIEWPORT_W - mmW - 10, mmY = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 2;
      ctx.strokeRect(mmX, mmY, mmW, mmH);

      // Minimap buildings
      BUILDINGS.forEach(b => {
        const bx = mmX + (b.x / CITY_WIDTH) * mmW;
        const by = mmY + (b.y / CITY_HEIGHT) * mmH;
        ctx.fillStyle = b.color + '88';
        ctx.fillRect(bx, by, Math.max(4, (b.width / CITY_WIDTH) * mmW), Math.max(3, (b.height / CITY_HEIGHT) * mmH));
      });

      // Minimap players
      players.forEach(p => {
        const px = mmX + (p.x / CITY_WIDTH) * mmW;
        const py = mmY + (p.y / CITY_HEIGHT) * mmH;
        ctx.fillStyle = p.user_id === userId ? '#00FF00' : '#FF4444';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Minimap viewport
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        mmX + (cameraOffset.x / CITY_WIDTH) * mmW,
        mmY + (cameraOffset.y / CITY_HEIGHT) * mmH,
        (VIEWPORT_W / CITY_WIDTH) * mmW,
        (VIEWPORT_H / CITY_HEIGHT) * mmH
      );

      ctx.font = '9px Arial';
      ctx.fillStyle = '#FF9900';
      ctx.textAlign = 'center';
      ctx.fillText('MINIMAP', mmX + mmW / 2, mmY + mmH + 12);

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameActive, players, diamonds, myPosition, myDirection, myColor, username, userId, nearBuilding, cameraOffset, workCooldowns, isWorking]);

  const drawBull = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, direction: string, name: string | null, isMe: boolean) => {
    const scale = 1.6;
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 28 * scale, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(x - 8, y - 8, 0, x, y, 28 * scale);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(1, shadeColor(color, -30));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 23 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 8, 9 * scale, 5 * scale, -0.4, 0, Math.PI * 2);
    ctx.fill();

    const headOffX = direction === 'left' ? -10 : direction === 'right' ? 10 : 0;
    const headOffY = direction === 'up' ? -8 : direction === 'down' ? 8 : -4;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + headOffX * 0.5, y + headOffY * 0.5 - 6, 12 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shadeColor(color, 20);
    ctx.beginPath();
    ctx.ellipse(x + headOffX * 0.3, y + headOffY * 0.3 + 6, 8 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x - 3, y + 8, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 3, y + 8, 1.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 16); ctx.quadraticCurveTo(x - 22, y - 30, x - 18, y - 42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 16); ctx.quadraticCurveTo(x + 22, y - 30, x + 18, y - 42);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 6, y - 10, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 6, y - 10, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 10, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(x, y + 6, 5, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = isMe ? 'bold 13px Arial' : '11px Arial';
    ctx.textAlign = 'center';
    const nameText = name || 'Player';
    const nameW = ctx.measureText(nameText).width + 14;
    
    ctx.fillStyle = isMe ? 'rgba(255, 153, 0, 0.9)' : 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = isMe ? '#FF9900' : '#475569';
    ctx.lineWidth = 2;
    
    const nameY = y - 58;
    ctx.beginPath();
    ctx.roundRect(x - nameW / 2, nameY - 7, nameW, 18, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isMe ? '#000' : '#fff';
    ctx.fillText(nameText, x, nameY + 5);

    if (isMe) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x + nameW / 2 - 4, nameY - 1, 4, 0, Math.PI * 2);
      ctx.fill();
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
      <div className="min-h-screen bg-[#0b1a2e] flex items-center justify-center">
        <Card className="p-8 text-center bg-[#0d2640] border-[#FF9900]/30">
          <div className="animate-spin w-12 h-12 border-4 border-[#FF9900] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-[#FF9900]">Entering Bull City...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1a2e] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" className="text-[#FF9900] hover:bg-[#FF9900]/10" onClick={() => { leaveCity(); navigate('/games/bull-world'); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Bull World
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF9900] via-[#FFD700] to-[#FF9900] bg-clip-text text-transparent">
            🏙️ Bull City 🌆
          </h1>
          <p className="text-[#FF9900]/60 text-sm">Explore the city, work at buildings to earn 💎, collect diamonds scattered around!</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-3 mb-3">
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-[#0d2640] border-[#FF9900]/30">
            <Users className="w-4 h-4 text-[#FF9900]" />
            <span className="text-white text-sm">{players.length} Online</span>
          </Card>
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-[#0d2640] border-[#FF9900]/30">
            <Gem className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-white text-sm">+{collectedDiamonds} Earned</span>
          </Card>
          {isWorking && (
            <Card className="px-3 py-1.5 flex items-center gap-2 bg-[#0d2640] border-[#FFD700]/50 animate-pulse">
              <Hammer className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] text-sm font-bold">Working...</span>
            </Card>
          )}
        </div>

        {/* Game Canvas */}
        <Card className="p-2 mb-3 overflow-hidden bg-[#0d2640] border-[#FF9900]/30">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_W}
            height={VIEWPORT_H}
            className="w-full rounded-lg"
            style={{ maxHeight: '60vh' }}
          />
        </Card>

        {/* Mobile Controls */}
        <Card className="p-3 md:hidden bg-[#0d2640] border-[#FF9900]/30">
          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#FF9900] text-[#FF9900]" onTouchStart={() => handleMobileMove('up')}>
              <ArrowUp className="w-6 h-6" />
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#FF9900] text-[#FF9900]" onTouchStart={() => handleMobileMove('left')}>
                <ArrowLeftIcon className="w-6 h-6" />
              </Button>
              {nearBuilding?.reward ? (
                <Button 
                  size="lg" 
                  className="w-14 h-14 rounded-full bg-[#FFD700] text-black font-bold"
                  onClick={() => nearBuilding && workAtBuilding(nearBuilding)}
                  disabled={isWorking}
                >
                  ⚒️
                </Button>
              ) : (
                <div className="w-14 h-14" />
              )}
              <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#FF9900] text-[#FF9900]" onTouchStart={() => handleMobileMove('right')}>
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
            <Button variant="outline" size="lg" className="w-14 h-14 rounded-full border-[#FF9900] text-[#FF9900]" onTouchStart={() => handleMobileMove('down')}>
              <ArrowDown className="w-6 h-6" />
            </Button>
          </div>
        </Card>

        {/* Buildings Guide */}
        <Card className="p-4 mt-3 bg-[#0d2640] border-[#FF9900]/30">
          <h3 className="font-bold text-[#FF9900] mb-2">🏗️ City Buildings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {BUILDINGS.filter(b => b.reward).map(b => (
              <div key={b.id} className="flex items-center gap-2 text-white/80">
                <span>{b.emoji}</span>
                <span>{b.name}</span>
                <span className="text-[#00D4FF]">+{b.reward}💎</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Controls */}
        <Card className="p-3 mt-3 hidden md:block bg-[#0d2640] border-[#FF9900]/30">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm text-white/80">
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#FF9900]">WASD</kbd> Move</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#FF9900]">E</kbd> Work</div>
            <div><kbd className="px-2 py-1 bg-[#1a3a4a] rounded text-[#FF9900]">SPACE</kbd> Interact</div>
          </div>
        </Card>
      </div>

      {/* Chat */}
      {userId && (
        <WorldChat 
          userId={userId} 
          username={username} 
          playerPosition={myPosition}
          onEmoteSent={() => {}}
        />
      )}
    </div>
  );
}
