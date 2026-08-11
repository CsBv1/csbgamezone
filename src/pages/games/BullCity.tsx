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

const CITY_WIDTH = 4000;   // same footprint as a Bull World dungeon region
const CITY_HEIGHT = 4000;
const PLAYER_SIZE = 45;
const MOVE_SPEED = 7;
const DB_UPDATE_INTERVAL = 200;
const SPAWN_X = 2000;
const SPAWN_Y = 2000;

/** Themed districts painted under the city grid. */
const DISTRICTS: { name: string; x: number; y: number; w: number; h: number; color: string; label: string }[] = [
  { name: 'Stake Plaza', x: 1550, y: 1550, w: 900, h: 900, color: '#00d4ff', label: '🐂 CARDANO STAKE BULLS PLAZA' },
  { name: 'Epoch Financial', x: 2500, y: 1350, w: 1350, h: 1050, color: '#ffd700', label: '🏦 EPOCH FINANCIAL DISTRICT' },
  { name: 'Plutus Tech Park', x: 150, y: 1300, w: 1300, h: 1100, color: '#9933ff', label: '🧪 PLUTUS TECH PARK' },
  { name: 'Hydra Harbour', x: 150, y: 2550, w: 1650, h: 1250, color: '#22d3ee', label: '🌊 HYDRA HARBOUR' },
  { name: 'Ouroboros Fields', x: 1400, y: 150, w: 1400, h: 1050, color: '#00ff88', label: '🌾 OUROBOROS FIELDS' },
  { name: 'Voltaire Quarter', x: 2000, y: 2600, w: 1800, h: 1200, color: '#f472b6', label: '🏛️ VOLTAIRE GOVERNANCE QUARTER' },
  { name: 'Midnight Ridge', x: 2900, y: 200, w: 950, h: 950, color: '#8b5cf6', label: '🌌 MIDNIGHT RIDGE' },
  { name: 'Genesis Wilds', x: 200, y: 200, w: 1000, h: 900, color: '#5ce65c', label: '🌲 GENESIS WILDS' },
];

const BUILDINGS: Building[] = [
  // ——— Stake Plaza (spawn) ———
  { id: 'spawn-gate', name: 'Bulls Spawn Gate', x: 1930, y: 1760, width: 140, height: 90, color: '#00D4FF', emoji: '🌀', type: 'decoration' },
  { id: 'bull-statue', name: 'Founder Bull Statue', x: 1920, y: 2150, width: 160, height: 140, color: '#C0C0C0', emoji: '🐂', type: 'decoration' },
  { id: 'stake-pool', name: 'Stake Pool HQ', x: 1640, y: 1640, width: 200, height: 150, color: '#00D4FF', emoji: '⚙️', type: 'forge', reward: 9, cooldownMs: 15000 },
  { id: 'rune-temple', name: 'Rune Power Temple', x: 2180, y: 1640, width: 190, height: 150, color: '#a78bfa', emoji: '🔯', type: 'forge', reward: 11, cooldownMs: 20000 },

  // ——— Epoch Financial District ———
  { id: 'ada-mint', name: 'ADA Mint', x: 2700, y: 1480, width: 210, height: 160, color: '#FFD700', emoji: '🪙', type: 'bank', reward: 14, cooldownMs: 26000 },
  { id: 'bull-bank', name: 'Bull Reserve Bank', x: 3150, y: 1500, width: 220, height: 180, color: '#FFD700', emoji: '🏦', type: 'bank', reward: 15, cooldownMs: 30000 },
  { id: 'dex-exchange', name: 'Bull DEX Exchange', x: 2760, y: 1950, width: 230, height: 170, color: '#00FF88', emoji: '📈', type: 'market', reward: 12, cooldownMs: 22000 },
  { id: 'epoch-tower', name: 'Epoch Clock Tower', x: 3400, y: 1950, width: 120, height: 230, color: '#f59e0b', emoji: '🕐', type: 'tower' },
  { id: 'nft-gallery', name: 'CNFT Gallery', x: 3180, y: 2200, width: 200, height: 150, color: '#ff6b35', emoji: '🖼️', type: 'market', reward: 10, cooldownMs: 18000 },

  // ——— Plutus Tech Park ———
  { id: 'plutus-lab', name: 'Plutus Smart Lab', x: 320, y: 1450, width: 220, height: 160, color: '#9933FF', emoji: '🔮', type: 'forge', reward: 10, cooldownMs: 20000 },
  { id: 'validator-farm', name: 'Validator Node Farm', x: 720, y: 1420, width: 240, height: 150, color: '#38bdf8', emoji: '🖥️', type: 'forge', reward: 13, cooldownMs: 24000 },
  { id: 'oracle-spire', name: 'Oracle Data Spire', x: 1120, y: 1500, width: 130, height: 240, color: '#c084fc', emoji: '🛰️', type: 'tower' },
  { id: 'crystal-lab', name: 'Crystal Research Lab', x: 420, y: 1900, width: 200, height: 150, color: '#7df9ff', emoji: '🧪', type: 'forge', reward: 11, cooldownMs: 21000 },
  { id: 'stake-factory', name: 'Stake Factory', x: 860, y: 1950, width: 230, height: 170, color: '#00FF88', emoji: '🏭', type: 'forge', reward: 12, cooldownMs: 25000 },

  // ——— Hydra Harbour ———
  { id: 'hydra-docks', name: 'Hydra Docks', x: 320, y: 2750, width: 250, height: 160, color: '#22d3ee', emoji: '⚓', type: 'market', reward: 9, cooldownMs: 16000 },
  { id: 'ada-lighthouse', name: 'ADA Lighthouse', x: 200, y: 3350, width: 120, height: 250, color: '#e2e8f0', emoji: '🗼', type: 'tower' },
  { id: 'fishing-wharf', name: 'Bull Fishing Wharf', x: 800, y: 3200, width: 220, height: 150, color: '#0ea5e9', emoji: '🎣', type: 'mine', reward: 7, cooldownMs: 13000 },
  { id: 'tavern', name: 'Harbour Bull Tavern', x: 1250, y: 2850, width: 200, height: 150, color: '#FF4444', emoji: '🍺', type: 'tavern' },
  { id: 'cargo-yard', name: 'Cargo Yard', x: 1300, y: 3350, width: 260, height: 170, color: '#fb923c', emoji: '📦', type: 'market', reward: 8, cooldownMs: 15000 },

  // ——— Ouroboros Fields ———
  { id: 'ouroboros-ring', name: 'Ouroboros Ring', x: 2020, y: 520, width: 260, height: 260, color: '#00ff88', emoji: '♾️', type: 'decoration' },
  { id: 'delegation-barn', name: 'Delegation Barn', x: 1550, y: 320, width: 230, height: 160, color: '#84cc16', emoji: '🚜', type: 'mine', reward: 6, cooldownMs: 11000 },
  { id: 'gem-quarry', name: 'Gem Quarry', x: 2450, y: 300, width: 220, height: 160, color: '#FF6B35', emoji: '💎', type: 'mine', reward: 6, cooldownMs: 12000 },
  { id: 'diamond-mine', name: 'Diamond Mine', x: 2450, y: 850, width: 220, height: 160, color: '#00D4FF', emoji: '⛏️', type: 'mine', reward: 5, cooldownMs: 10000 },
  { id: 'gold-forge', name: 'Gold Forge', x: 1550, y: 880, width: 200, height: 150, color: '#FFD700', emoji: '🔥', type: 'forge', reward: 8, cooldownMs: 15000 },

  // ——— Voltaire Governance Quarter ———
  { id: 'catalyst-hall', name: 'Catalyst Hall', x: 2300, y: 2800, width: 260, height: 180, color: '#f472b6', emoji: '🗳️', type: 'bank', reward: 13, cooldownMs: 27000 },
  { id: 'senate', name: 'Bull Senate', x: 2800, y: 3150, width: 280, height: 190, color: '#e879f9', emoji: '🏛️', type: 'tavern' },
  { id: 'treasury', name: 'Treasury Vault', x: 3350, y: 2800, width: 220, height: 170, color: '#FFD700', emoji: '🔐', type: 'bank', reward: 16, cooldownMs: 32000 },
  { id: 'arena-stadium', name: 'Bull Arena Stadium', x: 2250, y: 3350, width: 320, height: 220, color: '#ff4d6d', emoji: '⚔️', type: 'decoration' },
  { id: 'academy', name: 'Bull Academy', x: 3400, y: 3350, width: 240, height: 170, color: '#60a5fa', emoji: '🎓', type: 'market', reward: 9, cooldownMs: 17000 },

  // ——— Midnight Ridge ———
  { id: 'midnight-spire', name: 'Midnight Spire', x: 3250, y: 350, width: 150, height: 300, color: '#8b5cf6', emoji: '🌌', type: 'tower' },
  { id: 'shadow-market', name: 'Shadow Market', x: 3000, y: 800, width: 220, height: 160, color: '#a855f7', emoji: '🕯️', type: 'market', reward: 11, cooldownMs: 19000 },
  { id: 'observatory', name: 'Rune Observatory', x: 3550, y: 800, width: 200, height: 170, color: '#c4b5fd', emoji: '🔭', type: 'forge', reward: 10, cooldownMs: 18000 },

  // ——— Genesis Wilds ———
  { id: 'genesis-shrine', name: 'Genesis Shrine', x: 380, y: 380, width: 180, height: 160, color: '#5ce65c', emoji: '⛩️', type: 'decoration' },
  { id: 'lumber-camp', name: 'Bull Lumber Camp', x: 760, y: 620, width: 220, height: 150, color: '#a3e635', emoji: '🪓', type: 'mine', reward: 6, cooldownMs: 11000 },
  { id: 'wild-market', name: 'Wilds Trading Post', x: 320, y: 850, width: 210, height: 150, color: '#44FF44', emoji: '🏪', type: 'market', reward: 7, cooldownMs: 14000 },

  // ——— Landmarks / decoration ———
  { id: 'fountain', name: 'Ouroboros Fountain', x: 1900, y: 1900, width: 200, height: 200, color: '#00BBFF', emoji: '⛲', type: 'decoration' },
  { id: 'park', name: 'Central Bull Park', x: 1450, y: 2450, width: 300, height: 220, color: '#228B22', emoji: '🌳', type: 'decoration' },
  { id: 'tower-nw', name: 'North Watch Tower', x: 120, y: 120, width: 110, height: 180, color: '#667788', emoji: '🗼', type: 'tower' },
  { id: 'tower-ne', name: 'East Beacon', x: 3780, y: 120, width: 110, height: 180, color: '#667788', emoji: '🔦', type: 'tower' },
  { id: 'tower-sw', name: 'South Keep', x: 120, y: 3780, width: 110, height: 170, color: '#667788', emoji: '🏰', type: 'tower' },
  { id: 'tower-se', name: 'Frontier Post', x: 3780, y: 3780, width: 110, height: 170, color: '#667788', emoji: '🧭', type: 'tower' },
];

/** Ambient props — trees, lamps, holo-signs, water, cars. Purely visual. */
type Prop = { kind: 'tree' | 'lamp' | 'holo' | 'crate' | 'rock'; x: number; y: number; s?: number; text?: string };
const PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  // deterministic pseudo-random scatter so the city looks the same for everyone
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < 150; i++) {
    out.push({ kind: 'tree', x: 120 + rnd() * (CITY_WIDTH - 240), y: 120 + rnd() * (CITY_HEIGHT - 240), s: 0.8 + rnd() * 0.7 });
  }
  for (let i = 0; i < 70; i++) {
    out.push({ kind: 'rock', x: 120 + rnd() * (CITY_WIDTH - 240), y: 120 + rnd() * (CITY_HEIGHT - 240), s: 0.6 + rnd() * 0.8 });
  }
  for (let i = 0; i < 40; i++) {
    out.push({ kind: 'crate', x: 200 + rnd() * (CITY_WIDTH - 400), y: 200 + rnd() * (CITY_HEIGHT - 400), s: 0.7 + rnd() * 0.6 });
  }
  // street lamps along the main grid roads
  for (let x = 200; x < CITY_WIDTH; x += 400) {
    for (let y = 200; y < CITY_HEIGHT; y += 800) {
      out.push({ kind: 'lamp', x, y: y - 45 });
      out.push({ kind: 'lamp', x, y: y + 45 });
    }
  }
  const signs = ['STAKE $CSB', 'EPOCH 500', 'HYDRA ONLINE', 'BULL RUN 2026', 'DELEGATE NOW', 'CNFT DROP', 'VOTE CATALYST', 'RUNE POWER'];
  signs.forEach((t, i) => out.push({ kind: 'holo', x: 400 + (i % 4) * 950, y: 640 + Math.floor(i / 4) * 1900, text: t }));
  return out;
})();

/** Water bodies for Hydra Harbour. */
const WATER = [
  { x: 60, y: 3450, w: 1100, h: 480 },
  { x: 1180, y: 3620, w: 700, h: 320 },
];

// Roads layout — full 4000px grid
const ROADS = (() => {
  const r: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [];
  for (let y = 400; y < CITY_HEIGHT; y += 800) r.push({ x1: 0, y1: y, x2: CITY_WIDTH, y2: y, width: 70 });
  for (let x = 400; x < CITY_WIDTH; x += 800) r.push({ x1: x, y1: 0, x2: x, y2: CITY_HEIGHT, width: 70 });
  // ring road around the spawn plaza
  r.push({ x1: 1500, y1: 1500, x2: 2500, y2: 1500, width: 60 });
  r.push({ x1: 1500, y1: 2500, x2: 2500, y2: 2500, width: 60 });
  r.push({ x1: 1500, y1: 1500, x2: 1500, y2: 2500, width: 60 });
  r.push({ x1: 2500, y1: 1500, x2: 2500, y2: 2500, width: 60 });
  return r;
})();

export default function BullCity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [diamonds, setDiamonds] = useState<CityDiamond[]>([]);
  const [myPosition, setMyPosition] = useState({ x: SPAWN_X, y: SPAWN_Y });
  const [myDirection, setMyDirection] = useState('down');
  const [myColor, setMyColor] = useState('#00D4FF');
  const [username, setUsername] = useState<string | null>(null);
  const [collectedDiamonds, setCollectedDiamonds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [nearBuilding, setNearBuilding] = useState<Building | null>(null);
  const [workCooldowns, setWorkCooldowns] = useState<Record<string, number>>({});
  const [isWorking, setIsWorking] = useState(false);
  // ——— CMKR 🦉 (partner token) ———
  const [cmkrMined, setCmkrMined] = useState<Set<string>>(new Set());   // place ids mined this month by me
  const [cmkrGlobal, setCmkrGlobal] = useState(0);                      // total minted this month (all players)
  const [cmkrBoard, setCmkrBoard] = useState<{ user_id: string; username: string; total: number }[]>([]);
  const cmkrMinedRef = useRef<Set<string>>(new Set());
  const [cameraOffset, setCameraOffset] = useState({
    x: Math.max(0, Math.min(CITY_WIDTH - 1400, SPAWN_X - 700)),
    y: Math.max(0, Math.min(CITY_HEIGHT - 900, SPAWN_Y - 450)),
  });
  const keysPressed = useRef<Set<string>>(new Set());
  const lastDbUpdate = useRef<number>(0);
  const posRef = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const joystick = useRef({ active: false, dx: 0, dy: 0 });


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
      setMyPosition({ x: SPAWN_X, y: SPAWN_Y });
      posRef.current = { x: SPAWN_X, y: SPAWN_Y };
    } else {
      await supabase.from('world_players').insert({
        user_id: uid,
        x: SPAWN_X,
        y: SPAWN_Y,
        color,
        username: uname
      });
      setMyPosition({ x: SPAWN_X, y: SPAWN_Y });
      posRef.current = { x: SPAWN_X, y: SPAWN_Y };
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

    if (!existing || existing.length < 80) {
      const newItems = [];
      for (let i = 0; i < 80 - (existing?.length || 0); i++) {
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

  /* ——————————————— CMKR 🦉 partner token ——————————————— */
  const loadCmkr = useCallback(async () => {
    const { data } = await supabase
      .from('cmkr_earnings' as any)
      .select('user_id, username, place_id, amount')
      .eq('month', CMKR_MONTH);
    const rows = (data || []) as any[];

    setCmkrGlobal(rows.reduce((s, r) => s + (r.amount || 0), 0));

    const mine = new Set<string>(rows.filter(r => r.user_id === userId).map(r => r.place_id));
    cmkrMinedRef.current = mine;
    setCmkrMined(mine);

    const totals = new Map<string, { user_id: string; username: string; total: number }>();
    rows.forEach(r => {
      const e = totals.get(r.user_id) || { user_id: r.user_id, username: r.username || 'Bull', total: 0 };
      e.total += r.amount || 0;
      if (r.username) e.username = r.username;
      totals.set(r.user_id, e);
    });
    setCmkrBoard([...totals.values()].sort((a, b) => b.total - a.total).slice(0, 20));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadCmkr();
    const ch = supabase
      .channel('city-cmkr')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cmkr_earnings' }, () => loadCmkr())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadCmkr]);

  /** Award 1 🦉 CMKR for a place — once per place, per month, per player. */
  const tryMineCmkr = async (building: Building): Promise<boolean> => {
    if (!userId) return false;
    if (cmkrMinedRef.current.has(building.id)) return false;
    if (cmkrGlobal >= CMKR_MONTHLY_CAP) {
      toast({ title: '🦉 Monthly cap reached', description: `All ${CMKR_MONTHLY_CAP.toLocaleString()} CMKR for this month have been mined.` });
      return false;
    }
    const { error } = await supabase.from('cmkr_earnings' as any).insert({
      user_id: userId,
      username,
      place_id: building.id,
      month: CMKR_MONTH,
      amount: 1,
    });
    if (error) return false;
    cmkrMinedRef.current = new Set([...cmkrMinedRef.current, building.id]);
    setCmkrMined(cmkrMinedRef.current);
    loadCmkr();
    return true;
  };

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
      const gotOwl = await tryMineCmkr(building);

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
      }

      if (gotOwl) {
        toast({ title: `🦉 +1 CMKR mined!`, description: `${building.name} claimed for ${CMKR_MONTH}. One owl per place, per month.` });
      } else {
        toast({ title: `${building.emoji} +${building.reward} 💎`, description: `${building.name}'s 🦉 CMKR is already claimed this month.` });
      }
      audioManager.playSFX('win');
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
      let dx = 0, dy = 0;
      let newDirection = myDirection;

      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) dy -= 1;
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) dy += 1;
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) dx -= 1;
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) dx += 1;
      if (joystick.current.active) { dx += joystick.current.dx; dy += joystick.current.dy; }

      const mag = Math.hypot(dx, dy);
      if (mag > 0.05) {
        dx = (dx / mag) * MOVE_SPEED;
        dy = (dy / mag) * MOVE_SPEED;
        newDirection = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

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

  /** Analog joystick — same movement feel as the Bull World dungeon. */
  const handleStick = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    if (!point) return;
    const dx = (point.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (point.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const m = Math.max(1, Math.hypot(dx, dy));
    joystick.current.dx = dx / m;
    joystick.current.dy = dy / m;
  };

  const releaseStick = () => {
    joystick.current.active = false;
    joystick.current.dx = 0;
    joystick.current.dy = 0;

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

      const time = Date.now() / 1000;
      // visible window (used to cull props so the big map stays smooth)
      const vx0 = cameraOffset.x - 120, vy0 = cameraOffset.y - 120;
      const vx1 = cameraOffset.x + VIEWPORT_W + 120, vy1 = cameraOffset.y + VIEWPORT_H + 120;
      const inView = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

      // City background - dark with grid
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CITY_HEIGHT);
      bgGrad.addColorStop(0, '#081524');
      bgGrad.addColorStop(0.5, '#0d2640');
      bgGrad.addColorStop(1, '#050f1c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CITY_WIDTH, CITY_HEIGHT);

      /* ---------- districts ---------- */
      DISTRICTS.forEach(d => {
        const g = ctx.createRadialGradient(d.x + d.w / 2, d.y + d.h / 2, 40, d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) / 1.4);
        g.addColorStop(0, d.color + '22');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeStyle = d.color + '33';
        ctx.lineWidth = 2;
        ctx.setLineDash([16, 12]);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
        ctx.setLineDash([]);
        ctx.fillStyle = d.color + 'aa';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(d.label, d.x + 22, d.y + 38);
      });

      /* ---------- water (Hydra Harbour) ---------- */
      WATER.forEach(w => {
        const wg = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
        wg.addColorStop(0, 'rgba(20,120,160,0.75)');
        wg.addColorStop(1, 'rgba(8,50,80,0.85)');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.roundRect(w.x, w.y, w.w, w.h, 40);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,230,255,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        // animated wave lines
        ctx.strokeStyle = 'rgba(160,240,255,0.18)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const yy = w.y + 40 + i * (w.h / 9);
          ctx.beginPath();
          for (let xx = w.x + 20; xx < w.x + w.w - 20; xx += 24) {
            ctx.lineTo(xx, yy + Math.sin(time * 1.6 + xx * 0.02 + i) * 5);
          }
          ctx.stroke();
        }
      });

      // Grid pattern
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = Math.floor(vx0 / 100) * 100; x < vx1; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
      }
      for (let y = Math.floor(vy0 / 100) * 100; y < vy1; y += 100) {
        ctx.beginPath(); ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); ctx.stroke();
      }

      // Roads
      ROADS.forEach(road => {
        ctx.fillStyle = 'rgba(30, 48, 66, 0.92)';
        if (road.x1 === road.x2) {
          // Vertical
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(road.x1 - road.width / 2, road.y1); ctx.lineTo(road.x1 - road.width / 2, road.y2);
          ctx.moveTo(road.x1 + road.width / 2, road.y1); ctx.lineTo(road.x1 + road.width / 2, road.y2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
          ctx.setLineDash([20, 15]);
          ctx.beginPath(); ctx.moveTo(road.x1, road.y1); ctx.lineTo(road.x1, road.y2); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Horizontal
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(road.x1, road.y1 - road.width / 2); ctx.lineTo(road.x2, road.y1 - road.width / 2);
          ctx.moveTo(road.x1, road.y1 + road.width / 2); ctx.lineTo(road.x2, road.y1 + road.width / 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.3)';
          ctx.setLineDash([20, 15]);
          ctx.beginPath(); ctx.moveTo(road.x1, road.y1); ctx.lineTo(road.x2, road.y1); ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      /* ---------- spawn plaza ---------- */
      const plazaPulse = 1 + Math.sin(time * 1.5) * 0.05;
      const pg = ctx.createRadialGradient(SPAWN_X, SPAWN_Y, 20, SPAWN_X, SPAWN_Y, 340 * plazaPulse);
      pg.addColorStop(0, 'rgba(0,212,255,0.22)');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(SPAWN_X, SPAWN_Y, 340 * plazaPulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,212,255,0.45)';
      ctx.lineWidth = 4;
      for (let r = 120; r <= 300; r += 90) {
        ctx.beginPath(); ctx.arc(SPAWN_X, SPAWN_Y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,212,255,0.7)';
      ctx.font = 'bold 26px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐂 CARDANO STAKE BULLS ZONE', SPAWN_X, SPAWN_Y - 360);

      /* ---------- ambient props ---------- */
      PROPS.forEach((p, i) => {
        if (!inView(p.x, p.y)) return;
        const s = p.s || 1;
        if (p.kind === 'tree') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 14 * s, 16 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3b2a18';
          ctx.fillRect(p.x - 3 * s, p.y - 6 * s, 6 * s, 20 * s);
          const tg = ctx.createRadialGradient(p.x - 4 * s, p.y - 22 * s, 2, p.x, p.y - 16 * s, 22 * s);
          tg.addColorStop(0, '#7ef7a8');
          tg.addColorStop(1, '#12633a');
          ctx.fillStyle = tg;
          ctx.beginPath(); ctx.arc(p.x, p.y - 18 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === 'rock') {
          ctx.fillStyle = 'rgba(120,140,160,0.5)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 14 * s, 10 * s, 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(180,220,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        } else if (p.kind === 'crate') {
          ctx.fillStyle = 'rgba(180,120,60,0.75)';
          ctx.fillRect(p.x - 14 * s, p.y - 14 * s, 28 * s, 28 * s);
          ctx.strokeStyle = '#f0b96b'; ctx.lineWidth = 2;
          ctx.strokeRect(p.x - 14 * s, p.y - 14 * s, 28 * s, 28 * s);
          ctx.beginPath(); ctx.moveTo(p.x - 14 * s, p.y - 14 * s); ctx.lineTo(p.x + 14 * s, p.y + 14 * s); ctx.stroke();
        } else if (p.kind === 'lamp') {
          ctx.strokeStyle = '#5b7488'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 46); ctx.stroke();
          const flicker = 0.55 + Math.sin(time * 3 + i) * 0.12;
          const lg = ctx.createRadialGradient(p.x, p.y - 50, 0, p.x, p.y - 50, 60);
          lg.addColorStop(0, `rgba(255,215,120,${flicker * 0.5})`);
          lg.addColorStop(1, 'transparent');
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.arc(p.x, p.y - 50, 60, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffe08a';
          ctx.beginPath(); ctx.arc(p.x, p.y - 50, 6, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === 'holo') {
          const float = Math.sin(time * 1.2 + i) * 6;
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = 'rgba(0,212,255,0.12)';
          ctx.strokeStyle = 'rgba(0,212,255,0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(p.x - 110, p.y - 34 + float, 220, 56, 10); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#7df9ff';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14;
          ctx.fillText(p.text || '', p.x, p.y + 3 + float);
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      });

      // Floating particles
      for (let i = 0; i < 60; i++) {
        const px = vx0 + ((i * 137 + time * 12) % (VIEWPORT_W + 240));
        const py = vy0 + ((i * 211 + Math.sin(time * 0.8 + i) * 40) % (VIEWPORT_H + 240));
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,215,0,0.25)' : 'rgba(0, 212, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }


      // Draw buildings
      BUILDINGS.forEach(building => {
        if (!inView(building.x + building.width / 2, building.y + building.height / 2)) return;
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
      const mmW = 170, mmH = 170;
      const mmX = VIEWPORT_W - mmW - 10, mmY = 10;
      ctx.fillStyle = 'rgba(3,10,20,0.78)';
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 2;
      ctx.strokeRect(mmX, mmY, mmW, mmH);

      // Minimap districts
      DISTRICTS.forEach(d => {
        ctx.fillStyle = d.color + '33';
        ctx.fillRect(mmX + (d.x / CITY_WIDTH) * mmW, mmY + (d.y / CITY_HEIGHT) * mmH, (d.w / CITY_WIDTH) * mmW, (d.h / CITY_HEIGHT) * mmH);
      });

      // Minimap buildings
      BUILDINGS.forEach(b => {
        const bx = mmX + (b.x / CITY_WIDTH) * mmW;
        const by = mmY + (b.y / CITY_HEIGHT) * mmH;
        ctx.fillStyle = b.color + 'aa';
        ctx.fillRect(bx, by, Math.max(3, (b.width / CITY_WIDTH) * mmW), Math.max(3, (b.height / CITY_HEIGHT) * mmH));
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
    <div className="min-h-screen bg-gradient-to-b from-[#050b18] via-[#071427] to-[#050b18] p-3 md:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" className="text-cyan-300 hover:bg-cyan-400/10" onClick={() => { leaveCity(); navigate('/games/bull-world'); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Bull World
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]">
            🐂 Cardano Stake Bulls · Bull City
          </h1>
          <p className="text-cyan-200/50 text-xs md:text-sm">Explore an 8-district Cardano landscape — harbours, tech parks, governance halls and neon plazas. Work the buildings for 💎 and sweep up loose diamonds.</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-2 md:gap-3 mb-3 flex-wrap">
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-slate-900/70 border-cyan-500/30">
            <Users className="w-4 h-4 text-cyan-300" />
            <span className="text-white text-sm">{players.length} Online</span>
          </Card>
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-slate-900/70 border-cyan-500/30">
            <Gem className="w-4 h-4 text-cyan-300" />
            <span className="text-white text-sm">+{collectedDiamonds} Earned</span>
          </Card>
          {isWorking && (
            <Card className="px-3 py-1.5 flex items-center gap-2 bg-slate-900/70 border-amber-400/50 animate-pulse">
              <Hammer className="w-4 h-4 text-amber-300" />
              <span className="text-amber-300 text-sm font-bold">Working...</span>
            </Card>
          )}
        </div>

        {/* Game Canvas + on-screen controls */}
        <Card className="relative p-2 mb-3 overflow-hidden bg-slate-900/70 border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_W}
            height={VIEWPORT_H}
            className="w-full rounded-lg"
            style={{ maxHeight: '60vh' }}
          />

          {/* joystick — analog, identical feel to the dungeon */}
          <div className="absolute bottom-4 left-4">
            <div
              className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-slate-950/60 border-2 border-cyan-500/40 backdrop-blur touch-none flex items-center justify-center select-none"
              onTouchStart={(e) => { joystick.current.active = true; handleStick(e); }}
              onTouchMove={handleStick}
              onTouchEnd={releaseStick}
              onMouseDown={(e) => { joystick.current.active = true; handleStick(e); }}
              onMouseMove={(e) => { if (joystick.current.active) handleStick(e); }}
              onMouseUp={releaseStick}
              onMouseLeave={releaseStick}
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/25 border border-cyan-300/50 flex items-center justify-center text-[10px] text-cyan-200/70">MOVE</div>
            </div>
          </div>

          {/* work button — bottom right thumb zone */}
          <button
            onClick={() => nearBuilding && workAtBuilding(nearBuilding)}
            disabled={!nearBuilding?.reward || isWorking}
            className={`absolute bottom-6 right-4 w-20 h-20 rounded-full text-3xl font-bold border-4 transition-transform active:scale-90 flex items-center justify-center ${
              nearBuilding?.reward && !isWorking
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 text-black shadow-[0_0_28px_rgba(251,191,36,0.6)]'
                : 'bg-slate-900/60 border-slate-700 text-slate-600'
            }`}
          >
            ⚒️
          </button>
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
