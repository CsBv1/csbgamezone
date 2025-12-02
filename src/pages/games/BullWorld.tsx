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
}

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 3000;
const PLAYER_SIZE = 60;
const MOVE_SPEED = 12;

const GAME_PORTALS: GamePortal[] = [
  // Row 1
  { id: 'rhythm', name: 'Rhythm Rush', x: 400, y: 300, route: '/games/rhythm-rush', color: '#FF6B6B' },
  { id: 'gem', name: 'Gem Chain', x: 1200, y: 300, route: '/games/gem-chain', color: '#4ECDC4' },
  { id: 'plinko', name: 'Plinko', x: 2000, y: 300, route: '/games/plinko', color: '#9B59B6' },
  { id: 'mines', name: 'Mines', x: 2800, y: 300, route: '/games/mines', color: '#E74C3C' },
  { id: 'crash', name: 'Crash', x: 3600, y: 300, route: '/games/crash', color: '#F39C12' },
  // Row 2
  { id: 'risk', name: 'Risk Vault', x: 400, y: 1000, route: '/games/risk-vault', color: '#FFE66D' },
  { id: 'tower', name: 'Tower', x: 1200, y: 1000, route: '/games/tower', color: '#1ABC9C' },
  { id: 'coinflip', name: 'Coin Flip', x: 2000, y: 1000, route: '/games/coin-flip', color: '#3498DB' },
  { id: 'slots', name: 'Slots', x: 2800, y: 1000, route: '/games/slots', color: '#E91E63' },
  { id: 'blackjack', name: 'Blackjack', x: 3600, y: 1000, route: '/games/blackjack', color: '#2ECC71' },
  // Row 3
  { id: 'speed', name: 'Speed Run', x: 400, y: 1700, route: '/games/speed-run', color: '#95E1D3' },
  { id: 'diceroll', name: 'Dice Roll', x: 1200, y: 1700, route: '/games/dice-roll', color: '#8E44AD' },
  { id: 'wheel', name: 'Lucky Wheel', x: 2000, y: 1700, route: '/games/lucky-wheel', color: '#D35400' },
  { id: 'keno', name: 'Keno', x: 2800, y: 1700, route: '/games/keno', color: '#16A085' },
  { id: 'roulette', name: 'Roulette', x: 3600, y: 1700, route: '/games/roulette', color: '#C0392B' },
  // Row 4
  { id: 'aviator', name: 'Aviator', x: 400, y: 2400, route: '/games/aviator', color: '#00BCD4' },
  { id: 'hilo', name: 'Hi-Lo', x: 1200, y: 2400, route: '/games/hi-lo', color: '#FF5722' },
  { id: 'limbo', name: 'Limbo', x: 2000, y: 2400, route: '/games/limbo', color: '#673AB7' },
  { id: 'scratch', name: 'Scratch', x: 2800, y: 2400, route: '/games/scratch', color: '#CDDC39' },
  { id: 'bullrun', name: 'Bull Run', x: 3600, y: 2400, route: '/games/bull-run', color: '#FFD700' },
];

export default function BullWorld() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [diamonds, setDiamonds] = useState<WorldDiamond[]>([]);
  const [myPosition, setMyPosition] = useState({ x: 2000, y: 1500 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [myDirection, setMyDirection] = useState('down');
  const [myColor, setMyColor] = useState('#FFD700');
  const [username, setUsername] = useState<string | null>(null);
  const [keys, setKeys] = useState(0);
  const [collectedDiamonds, setCollectedDiamonds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());

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

      // Get user profile and color
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

      if (currentKeys < 1) {
        toast({ title: "No Keys", description: "You need 1 key to enter Bull World", variant: "destructive" });
        navigate('/');
        return;
      }

      // Deduct key
      await supabase.from('user_keys').update({ balance: currentKeys - 1 }).eq('user_id', user.id);
      setKeys(currentKeys - 1);

      // Join the world
      await joinWorld(user.id, (profileResult.data as any)?.username, (colorsResult.data as any)?.color_value || '#FFD700');
      setGameActive(true);
      setIsLoading(false);
    };
    init();

    return () => {
      if (userId) leaveWorld();
    };
  }, []);

  const joinWorld = async (uid: string, uname: string | null, color: string) => {
    // Check if player already exists
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
      const startX = 1800 + Math.random() * 400;
      const startY = 1300 + Math.random() * 400;
      await supabase.from('world_players').insert({
        user_id: uid,
        x: startX,
        y: startY,
        color,
        username: uname
      });
      setMyPosition({ x: startX, y: startY });
    }

    // Spawn some diamonds
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
    // Check if there are enough collectibles (diamonds and coins)
    const { data: existing } = await supabase
      .from('world_diamonds')
      .select('*')
      .is('collected_by', null);

    if (!existing || existing.length < 50) {
      const newItems = [];
      for (let i = 0; i < 50 - (existing?.length || 0); i++) {
        // Mix of diamonds (value 1-3) and gold coins (value 5-10)
        const isGoldCoin = Math.random() > 0.6;
        newItems.push({
          x: 200 + Math.random() * (WORLD_WIDTH - 400),
          y: 200 + Math.random() * (WORLD_HEIGHT - 400),
          value: isGoldCoin ? Math.floor(Math.random() * 6) + 5 : Math.floor(Math.random() * 3) + 1
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_players' }, () => {
        fetchPlayers();
      })
      .subscribe();

    const diamondsChannel = supabase
      .channel('world-diamonds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_diamonds' }, () => {
        fetchDiamonds();
      })
      .subscribe();

    fetchPlayers();
    fetchDiamonds();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(diamondsChannel);
    };
  }, [gameActive]);

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('world_players')
      .select('*')
      .eq('is_online', true);
    if (data) setPlayers(data as Player[]);
  };

  const fetchDiamonds = async () => {
    const { data } = await supabase
      .from('world_diamonds')
      .select('*')
      .is('collected_by', null);
    if (data) setDiamonds(data as WorldDiamond[]);
  };

  // Movement controls
  useEffect(() => {
    if (!gameActive) return;

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
  }, [gameActive]);

  // Game loop
  useEffect(() => {
    if (!gameActive || !userId) return;

    const gameLoop = setInterval(() => {
      let dx = 0, dy = 0;
      let newDirection = myDirection;

      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) { dy = -MOVE_SPEED; newDirection = 'up'; }
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) { dy = MOVE_SPEED; newDirection = 'down'; }
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) { dx = -MOVE_SPEED; newDirection = 'left'; }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) { dx = MOVE_SPEED; newDirection = 'right'; }

      if (dx !== 0 || dy !== 0) {
        setMyPosition(prev => {
          const newX = Math.max(40, Math.min(WORLD_WIDTH - 40, prev.x + dx));
          const newY = Math.max(40, Math.min(WORLD_HEIGHT - 40, prev.y + dy));
          
          // Update in database (throttled)
          supabase
            .from('world_players')
            .update({ x: newX, y: newY, direction: newDirection, last_seen: new Date().toISOString() })
            .eq('user_id', userId);

          return { x: newX, y: newY };
        });
        setMyDirection(newDirection);
      }

      // Check diamond/coin collection
      diamonds.forEach(diamond => {
        const dist = Math.sqrt(Math.pow(myPosition.x - diamond.x, 2) + Math.pow(myPosition.y - diamond.y, 2));
        if (dist < 50) {
          collectDiamond(diamond);
        }
      });

      // Check portal proximity
      GAME_PORTALS.forEach(portal => {
        const dist = Math.sqrt(Math.pow(myPosition.x - portal.x, 2) + Math.pow(myPosition.y - portal.y, 2));
        if (dist < 60) {
          // Show portal hint
        }
      });
    }, 50);

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
      const isGoldCoin = diamond.value >= 5;
      toast({ title: `+${diamond.value} ${isGoldCoin ? '🪙' : '💎'}`, description: isGoldCoin ? "Gold coin collected!" : "Diamond collected!" });
      
      // Add to user's balance
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

      // Spawn new diamond
      setTimeout(spawnDiamonds, 2000);
    }
  };

  const enterPortal = (portal: GamePortal) => {
    // Store in sessionStorage that user came from Bull World - games are free inside
    sessionStorage.setItem('bullWorldAccess', 'true');
    sessionStorage.setItem('fromBullWorld', 'true'); // For return navigation
    leaveWorld();
    navigate(portal.route);
  };

  // Mobile touch controls
  const handleMobileMove = (direction: string) => {
    let dx = 0, dy = 0;
    if (direction === 'up') { dy = -MOVE_SPEED * 2; }
    if (direction === 'down') { dy = MOVE_SPEED * 2; }
    if (direction === 'left') { dx = -MOVE_SPEED * 2; }
    if (direction === 'right') { dx = MOVE_SPEED * 2; }

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

  // Update camera to follow player
  useEffect(() => {
    const canvasWidth = 1200;
    const canvasHeight = 700;
    const offsetX = Math.max(0, Math.min(WORLD_WIDTH - canvasWidth, myPosition.x - canvasWidth / 2));
    const offsetY = Math.max(0, Math.min(WORLD_HEIGHT - canvasHeight, myPosition.y - canvasHeight / 2));
    setCameraOffset({ x: offsetX, y: offsetY });
  }, [myPosition]);

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const canvasWidth = 1200;
    const canvasHeight = 700;

    // Generate terrain decorations based on world size
    const generateDecorations = () => {
      const trees: {x: number, y: number}[] = [];
      const rocks: {x: number, y: number}[] = [];
      const flowers: {x: number, y: number}[] = [];
      
      // Generate trees across entire map
      for (let i = 0; i < 100; i++) {
        trees.push({
          x: (i * 397 + 100) % WORLD_WIDTH,
          y: (i * 283 + 150) % WORLD_HEIGHT
        });
      }
      // Generate rocks
      for (let i = 0; i < 60; i++) {
        rocks.push({
          x: (i * 521 + 200) % WORLD_WIDTH,
          y: (i * 337 + 100) % WORLD_HEIGHT
        });
      }
      // Generate flowers
      for (let i = 0; i < 150; i++) {
        flowers.push({
          x: (i * 173 + 50) % WORLD_WIDTH,
          y: (i * 127 + 80) % WORLD_HEIGHT
        });
      }
      return { trees, rocks, flowers };
    };

    const { trees, rocks, flowers } = generateDecorations();

    const render = () => {
      ctx.save();
      ctx.translate(-cameraOffset.x, -cameraOffset.y);

      // Draw grass background with gradient
      const grassGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      grassGradient.addColorStop(0, '#2d5a27');
      grassGradient.addColorStop(0.5, '#1e4d1a');
      grassGradient.addColorStop(1, '#163812');
      ctx.fillStyle = grassGradient;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Draw grid lines for navigation (subtle)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < WORLD_WIDTH; x += 400) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < WORLD_HEIGHT; y += 400) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      // Draw dirt paths connecting portals
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 50;
      ctx.lineCap = 'round';
      
      // Horizontal paths
      for (let row = 0; row < 4; row++) {
        const y = 300 + row * 700;
        ctx.beginPath();
        ctx.moveTo(200, y);
        ctx.lineTo(3800, y);
        ctx.stroke();
      }
      // Vertical paths
      for (let col = 0; col < 5; col++) {
        const x = 400 + col * 800;
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.lineTo(x, 2600);
        ctx.stroke();
      }

      // Draw grass patches
      for (let i = 0; i < 200; i++) {
        const gx = (i * 137 + 50) % WORLD_WIDTH;
        const gy = (i * 89 + 30) % WORLD_HEIGHT;
        ctx.fillStyle = `rgba(34, 139, 34, ${0.3 + (i % 5) * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 30 + (i % 3) * 10, 15 + (i % 2) * 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw flowers (only visible ones)
      flowers.forEach(flower => {
        if (flower.x < cameraOffset.x - 50 || flower.x > cameraOffset.x + canvasWidth + 50) return;
        if (flower.y < cameraOffset.y - 50 || flower.y > cameraOffset.y + canvasHeight + 50) return;
        
        const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF69B4', '#DDA0DD'];
        ctx.fillStyle = colors[Math.floor((flower.x + flower.y) % colors.length)];
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw rocks (only visible ones)
      rocks.forEach(rock => {
        if (rock.x < cameraOffset.x - 50 || rock.x > cameraOffset.x + canvasWidth + 50) return;
        if (rock.y < cameraOffset.y - 50 || rock.y > cameraOffset.y + canvasHeight + 50) return;
        
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.ellipse(rock.x, rock.y, 18, 12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.ellipse(rock.x - 4, rock.y - 4, 10, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw trees (only visible ones)
      trees.forEach(tree => {
        if (tree.x < cameraOffset.x - 80 || tree.x > cameraOffset.x + canvasWidth + 80) return;
        if (tree.y < cameraOffset.y - 100 || tree.y > cameraOffset.y + canvasHeight + 80) return;
        
        // Tree shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(tree.x + 10, tree.y + 50, 35, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tree trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(tree.x - 10, tree.y - 5, 20, 55);
        
        // Tree foliage layers
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y - 40, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(tree.x - 15, tree.y - 30, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tree.x + 15, tree.y - 38, 18, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw game portals
      GAME_PORTALS.forEach(portal => {
        // Portal glow
        const gradient = ctx.createRadialGradient(portal.x, portal.y, 0, portal.x, portal.y, 100);
        gradient.addColorStop(0, portal.color + '90');
        gradient.addColorStop(0.5, portal.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(portal.x - 100, portal.y - 100, 200, 200);

        // Portal ring
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y, 70, 45, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Portal base
        ctx.fillStyle = portal.color + 'CC';
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y, 65, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(portal.x, portal.y - 10, 40, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Portal name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(portal.name, portal.x, portal.y + 80);
        ctx.shadowBlur = 0;
        ctx.font = '40px Arial';
        ctx.fillText('🎮', portal.x, portal.y - 50);
      });

      // Draw diamonds and gold coins
      diamonds.forEach(diamond => {
        const isGoldCoin = diamond.value >= 5;
        ctx.font = '42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isGoldCoin ? '🪙' : '💎', diamond.x, diamond.y + 14);
        
        // Sparkle effect
        const time = Date.now() / 200;
        ctx.fillStyle = isGoldCoin 
          ? `rgba(255, 215, 0, ${0.3 + Math.sin(time + diamond.x) * 0.2})`
          : `rgba(0, 255, 255, ${0.3 + Math.sin(time + diamond.y) * 0.2})`;
        ctx.beginPath();
        ctx.arc(diamond.x, diamond.y, 28 + Math.sin(time) * 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Value indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.fillText(`+${diamond.value}`, diamond.x, diamond.y + 45);
        ctx.shadowBlur = 0;
      });

      // Draw other players
      players.forEach(player => {
        if (player.user_id === userId) return;
        drawBull(ctx, player.x, player.y, player.color, player.direction, player.username);
      });

      // Draw current player
      drawBull(ctx, myPosition.x, myPosition.y, myColor, myDirection, username, true);

      ctx.restore();

      // Draw minimap
      const minimapSize = 150;
      const minimapX = canvasWidth - minimapSize - 10;
      const minimapY = 10;
      
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize * (WORLD_HEIGHT / WORLD_WIDTH));
      
      // Draw portals on minimap
      GAME_PORTALS.forEach(portal => {
        ctx.fillStyle = portal.color;
        ctx.beginPath();
        ctx.arc(
          minimapX + (portal.x / WORLD_WIDTH) * minimapSize,
          minimapY + (portal.y / WORLD_HEIGHT) * minimapSize * (WORLD_HEIGHT / WORLD_WIDTH),
          3, 0, Math.PI * 2
        );
        ctx.fill();
      });
      
      // Draw player on minimap
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(
        minimapX + (myPosition.x / WORLD_WIDTH) * minimapSize,
        minimapY + (myPosition.y / WORLD_HEIGHT) * minimapSize * (WORLD_HEIGHT / WORLD_WIDTH),
        4, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Minimap border
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize * (WORLD_HEIGHT / WORLD_WIDTH));

      requestAnimationFrame(render);
    };

    render();
  }, [gameActive, players, diamonds, myPosition, myDirection, myColor, username, userId, cameraOffset]);

  const drawBull = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, direction: string, name: string | null, isMe: boolean = false) => {
    const scale = 2.2; // Bigger bull!
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 25 * scale, 22 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (bigger isometric bull shape)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 28 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 8, 12 * scale, 8 * scale, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    const headOffsetX = direction === 'left' ? -18 : direction === 'right' ? 18 : 0;
    const headOffsetY = direction === 'up' ? -15 : direction === 'down' ? 15 : 0;
    ctx.arc(x + headOffsetX * 0.5, y + headOffsetY * 0.5 - 10, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + headOffsetX * 0.3, y + headOffsetY * 0.3 + 5, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nostrils
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x - 5 + headOffsetX * 0.2, y + headOffsetY * 0.2 + 8, 3, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5 + headOffsetX * 0.2, y + headOffsetY * 0.2 + 8, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns - bigger and more curved
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 20);
    ctx.quadraticCurveTo(x - 30, y - 35, x - 25, y - 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 20);
    ctx.quadraticCurveTo(x + 30, y - 35, x + 25, y - 50);
    ctx.stroke();
    
    // Horn tips
    ctx.strokeStyle = '#FFF8DC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 45);
    ctx.lineTo(x - 25, y - 50);
    ctx.moveTo(x + 26, y - 45);
    ctx.lineTo(x + 25, y - 50);
    ctx.stroke();
    
    // Ears
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x - 22, y - 15, 8, 5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + 22, y - 15, 8, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 8, y - 15, 6, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 15, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 8, y - 15, 3, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 15, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 9, y - 16, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose ring - bigger
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y + 5, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Name tag - bigger
    ctx.fillStyle = isMe ? '#000' : '#000';
    ctx.font = isMe ? 'bold 16px Arial' : '14px Arial';
    ctx.textAlign = 'center';
    // Background for name
    const nameWidth = ctx.measureText(name || 'Player').width + 12;
    ctx.fillStyle = isMe ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(x - nameWidth / 2, y - 70, nameWidth, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(name || 'Player', x, y - 55);

    // Online indicator for current player
    if (isMe) {
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(x + nameWidth / 2 + 8, y - 60, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#006600';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Entering Bull World...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => { leaveWorld(); navigate('/'); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit World
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🐂 Bull World 🌍</h1>
          <p className="text-muted-foreground">Explore, collect diamonds, and play games with other players!</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-4">
          <Card className="px-4 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>{players.length} Online</span>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-2">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span>+{collectedDiamonds} Collected</span>
          </Card>
        </div>

        {/* Game Canvas */}
        <Card className="p-2 mb-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1200}
            height={700}
            className="w-full rounded-lg border-2 border-primary/20"
            style={{ imageRendering: 'auto' }}
          />
        </Card>

        {/* Mobile Controls */}
        <Card className="p-4 md:hidden">
          <h3 className="font-bold mb-3 text-center">Mobile Controls</h3>
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="w-16 h-16 rounded-full"
              onTouchStart={() => handleMobileMove('up')}
              onMouseDown={() => handleMobileMove('up')}
            >
              <ArrowUp className="w-8 h-8" />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full"
                onTouchStart={() => handleMobileMove('left')}
                onMouseDown={() => handleMobileMove('left')}
              >
                <ArrowLeftIcon className="w-8 h-8" />
              </Button>
              <div className="w-16 h-16" /> {/* Spacer */}
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full"
                onTouchStart={() => handleMobileMove('right')}
                onMouseDown={() => handleMobileMove('right')}
              >
                <ArrowRight className="w-8 h-8" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-16 h-16 rounded-full"
              onTouchStart={() => handleMobileMove('down')}
              onMouseDown={() => handleMobileMove('down')}
            >
              <ArrowDown className="w-8 h-8" />
            </Button>
          </div>
        </Card>

        {/* Desktop Controls */}
        <Card className="p-4 hidden md:block">
          <h3 className="font-bold mb-2">Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><kbd className="px-2 py-1 bg-muted rounded">↑ W</kbd> Move Up</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">↓ S</kbd> Move Down</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">← A</kbd> Move Left</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">→ D</kbd> Move Right</div>
          </div>
        </Card>

        <p className="text-muted-foreground text-sm text-center">
          <Gamepad2 className="w-4 h-4 inline mr-1" />
          Walk to a portal to enter a mini-game (FREE inside Bull World)! Collect 💎 diamonds and 🪙 gold coins!
        </p>

        {/* Portal buttons for quick access */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {GAME_PORTALS.map(portal => (
            <Button
              key={portal.id}
              variant="outline"
              className="border-2"
              style={{ borderColor: portal.color }}
              onClick={() => enterPortal(portal)}
            >
              🎮 {portal.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}