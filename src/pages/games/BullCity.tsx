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
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useHeldCsbBulls, type HeldCsbBull } from "@/hooks/useHeldCsbBulls";
import { Sparkles } from "lucide-react";

type CityBull = { nft_id: string | null; name: string; image?: string | null; level: number };

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
/** Bigger, cinematic viewport (16:9). */
const VIEWPORT_W = 1760;
const VIEWPORT_H = 990;
const SPAWN_X = 2000;
const SPAWN_Y = 2000;

/** CMKR 🦉 — partner token. 5 owls per place, per player, per day. */
const CMKR_MONTHLY_CAP = 1_000_000;
const CMKR_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM
const CMKR_DAY = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
const CMKR_DAILY_PER_PLACE = 5;

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
  const [cmkrMined, setCmkrMined] = useState<Set<string>>(new Set());   // place ids maxed out today by me
  const [cmkrToday, setCmkrToday] = useState<Record<string, number>>({}); // place id -> owls mined today by me
  const [cmkrMyMonth, setCmkrMyMonth] = useState(0);                    // my total owls this month
  const [cmkrGlobal, setCmkrGlobal] = useState(0);                      // total minted this month (all players)
  const [cmkrBoard, setCmkrBoard] = useState<{ user_id: string; username: string; total: number }[]>([]);
  const [autoMine, setAutoMine] = useState(false);
  const cmkrMinedRef = useRef<Set<string>>(new Set());
  const cmkrTodayRef = useRef<Record<string, number>>({});
  const [cameraOffset, setCameraOffset] = useState({
    x: Math.max(0, Math.min(CITY_WIDTH - VIEWPORT_W, SPAWN_X - VIEWPORT_W / 2)),
    y: Math.max(0, Math.min(CITY_HEIGHT - VIEWPORT_H, SPAWN_Y - VIEWPORT_H / 2)),
  });
  const keysPressed = useRef<Set<string>>(new Set());
  const lastDbUpdate = useRef<number>(0);
  const posRef = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const joystick = useRef({ active: false, dx: 0, dy: 0 });

  /* ——— Bull selection: your CNFT becomes your city avatar ——— */
  const [myBull, setMyBull] = useState<CityBull | null>(null);
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const heldBulls = useHeldCsbBulls(userId, (walletNfts || []) as any);
  const bullArt = useRef<HTMLImageElement | null>(null);
  const otherArt = useRef<Record<string, HTMLImageElement>>({});

  /* keep the picked bull in sync once artwork resolves */
  useEffect(() => {
    if (!myBull?.nft_id) return;
    const fresh = heldBulls.find((b) => b.nft_id.toLowerCase() === String(myBull.nft_id).toLowerCase());
    if (fresh?.image && fresh.image !== myBull.image) setMyBull({ ...myBull, image: fresh.image, level: fresh.level });
  }, [heldBulls, myBull]);

  /* load my bull artwork for canvas rendering */
  useEffect(() => {
    bullArt.current = null;
    if (!myBull?.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { bullArt.current = img; };
    img.src = myBull.image;
  }, [myBull?.image]);

  /* pull other players' bull artwork so the city shows real CNFTs */
  useEffect(() => {
    if (!gameActive) return;
    const ids = players.map((p) => p.user_id).filter((id) => id && id !== userId && !otherArt.current[id]);
    if (!ids.length) return;
    (async () => {
      const { data } = await supabase.from("bw_characters" as any).select("user_id,bull_image").in("user_id", ids);
      ((data || []) as any[]).forEach((row) => {
        if (!row.bull_image || otherArt.current[row.user_id]) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { otherArt.current[row.user_id] = img; };
        img.src = row.bull_image;
      });
    })();
  }, [players, gameActive, userId]);

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

      // Free entry — the player first picks the Bull that becomes their avatar
      setIsLoading(false);
    };
    init();

    return () => {
      if (userId) leaveCity();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  /** Enter the city with the chosen bull. */
  const enterCityWithBull = async (bull: CityBull) => {
    if (!userId) return;
    setMyBull(bull);
    await joinCity(userId, username, myColor);
    setGameActive(true);
  };

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

    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
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
      .select('user_id, username, place_id, amount, day')
      .eq('month', CMKR_MONTH);
    const rows = (data || []) as any[];

    setCmkrGlobal(rows.reduce((s, r) => s + (r.amount || 0), 0));

    const myRows = rows.filter(r => r.user_id === userId);
    setCmkrMyMonth(myRows.reduce((s, r) => s + (r.amount || 0), 0));

    const today: Record<string, number> = {};
    myRows.filter(r => String(r.day).slice(0, 10) === CMKR_DAY).forEach(r => {
      today[r.place_id] = (today[r.place_id] || 0) + (r.amount || 0);
    });
    cmkrTodayRef.current = today;
    setCmkrToday(today);

    const maxed = new Set<string>(Object.keys(today).filter(k => today[k] >= CMKR_DAILY_PER_PLACE));
    cmkrMinedRef.current = maxed;
    setCmkrMined(maxed);

    const totals = new Map<string, { user_id: string; username: string; total: number }>();
    rows.forEach(r => {
      const e = totals.get(r.user_id) || { user_id: r.user_id, username: r.username || 'Bull', total: 0 };
      e.total += r.amount || 0;
      if (r.username) e.username = r.username;
      totals.set(r.user_id, e);
    });
    setCmkrBoard([...totals.values()].sort((a, b) => b.total - a.total));
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

  /** Award 1 🦉 CMKR for a place — up to 5 per place, per day, per player. */
  const tryMineCmkr = async (building: Building): Promise<boolean> => {
    if (!userId) return false;
    if ((cmkrTodayRef.current[building.id] || 0) >= CMKR_DAILY_PER_PLACE) return false;
    if (cmkrGlobal >= CMKR_MONTHLY_CAP) {
      toast({ title: '🦉 Monthly cap reached', description: `All ${CMKR_MONTHLY_CAP.toLocaleString()} CMKR for this month have been mined.` });
      return false;
    }
    const { error } = await supabase.from('cmkr_earnings' as any).insert({
      user_id: userId,
      username,
      place_id: building.id,
      month: CMKR_MONTH,
      day: CMKR_DAY,
      amount: 1,
    });
    if (error) return false;
    const next = { ...cmkrTodayRef.current, [building.id]: (cmkrTodayRef.current[building.id] || 0) + 1 };
    cmkrTodayRef.current = next;
    setCmkrToday(next);
    if (next[building.id] >= CMKR_DAILY_PER_PLACE) {
      cmkrMinedRef.current = new Set([...cmkrMinedRef.current, building.id]);
      setCmkrMined(cmkrMinedRef.current);
    }
    loadCmkr();
    return true;
  };

  const workAtBuilding = async (building: Building, silent = false) => {
    if (!userId || !building.reward || isWorking) return;
    
    const now = Date.now();
    const lastWork = workCooldowns[building.id] || 0;
    if (now - lastWork < (building.cooldownMs || 10000)) {
      const remaining = Math.ceil(((building.cooldownMs || 10000) - (now - lastWork)) / 1000);
      if (!silent) toast({ title: "⏳ Cooldown", description: `Wait ${remaining}s to work here again` });
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
        const left = CMKR_DAILY_PER_PLACE - (cmkrTodayRef.current[building.id] || 0);
        toast({ title: `🦉 +1 CMKR mined!`, description: `${building.name} — ${left} of ${CMKR_DAILY_PER_PLACE} owls left here today.` });
      } else {
        toast({ title: `${building.emoji} +${building.reward} 💎`, description: `${building.name}'s 5 daily 🦉 CMKR are done — resets tomorrow.` });
      }
      audioManager.playSFX('win');
    } catch (error) {
      console.error('Work error:', error);
    } finally {
      setIsWorking(false);
    }
  };

  /* ——————————————— Auto-mine ——————————————— */
  const workFnRef = useRef(workAtBuilding);
  workFnRef.current = workAtBuilding;
  const nearBuildingRef = useRef(nearBuilding);
  nearBuildingRef.current = nearBuilding;
  const isWorkingRef = useRef(isWorking);
  isWorkingRef.current = isWorking;
  const autoMineRef = useRef(autoMine);
  autoMineRef.current = autoMine;
  const cooldownsRef = useRef(workCooldowns);
  cooldownsRef.current = workCooldowns;
  /** Building the auto-miner is currently walking towards. */
  const autoTargetRef = useRef<Building | null>(null);

  /** Nearest building that still has owls left today (cooldown-aware). */
  const pickAutoTarget = useCallback((): Building | null => {
    const now = Date.now();
    const p = posRef.current;
    const open = BUILDINGS.filter(
      (b) => b.reward && (cmkrTodayRef.current[b.id] || 0) < CMKR_DAILY_PER_PLACE
    );
    const ready = open.filter((b) => now - (cooldownsRef.current[b.id] || 0) >= (b.cooldownMs || 10000));
    const pool = ready.length ? ready : open;
    if (!pool.length) return null;
    return pool.reduce((best, b) => {
      const d = Math.hypot(p.x - (b.x + b.width / 2), p.y - (b.y + b.height / 2));
      const bd = Math.hypot(p.x - (best.x + best.width / 2), p.y - (best.y + best.height / 2));
      return d < bd ? b : best;
    });
  }, []);

  useEffect(() => {
    if (!autoMine) { autoTargetRef.current = null; return; }
    if (!gameActive) return;
    const t = setInterval(() => {
      const b = nearBuildingRef.current;
      if (b?.reward && !isWorkingRef.current && (cmkrTodayRef.current[b.id] || 0) < CMKR_DAILY_PER_PLACE) {
        workFnRef.current(b, true);
      }
    }, 900);
    return () => clearInterval(t);
  }, [autoMine, gameActive]);



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

      let mag = Math.hypot(dx, dy);

      // Auto-pilot: walk to the next building that still has owls left today
      if (mag <= 0.05 && autoMineRef.current && !isWorkingRef.current) {
        const t = autoTargetRef.current;
        const stillOpen =
          t && (cmkrTodayRef.current[t.id] || 0) < CMKR_DAILY_PER_PLACE;
        const target = stillOpen ? t! : pickAutoTarget();
        autoTargetRef.current = target;
        if (target) {
          const tx = target.x + target.width / 2;
          const ty = target.y + target.height / 2;
          const vx = tx - posRef.current.x;
          const vy = ty - posRef.current.y;
          const dist = Math.hypot(vx, vy);
          if (dist > 70) {
            dx = vx / dist;
            dy = vy / dist;
            mag = 1;
          }
        }
      }


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
        // (district label is drawn on top of the buildings later so it stays readable)
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


      // ——————————— Draw buildings (extruded 3D) ———————————
      const camCX = cameraOffset.x + VIEWPORT_W / 2;
      const camCY = cameraOffset.y + VIEWPORT_H / 2;
      const heightFor = (b: Building) => {
        const base: Record<string, number> = {
          tower: 2.1, bank: 1.25, forge: 1.0, market: 0.9, mine: 0.8, tavern: 0.95, decoration: 0.45,
        };
        return Math.max(40, b.height * (base[b.type] ?? 0.9));
      };

      // painter's algorithm — far buildings first so near ones overlap them
      [...BUILDINGS].sort((a, b) => (a.y + a.height) - (b.y + b.height)).forEach(building => {
        if (!inView(building.x + building.width / 2, building.y + building.height / 2)) return;
        const bx = building.x, by = building.y, bw = building.width, bh = building.height;
        const cx = bx + bw / 2;
        const isNear = nearBuilding?.id === building.id;
        const H = heightFor(building);

        // fake perspective: parallax skew away from the camera centre
        const ox = Math.max(-0.55, Math.min(0.55, (cx - camCX) / (VIEWPORT_W * 1.1))) * H;
        const oy = Math.max(-0.25, Math.min(0.25, ((by + bh) - camCY) / (VIEWPORT_H * 2.2))) * H;
        const topY = by - H + oy;

        const wallDark = shadeColor(building.color, -62);
        const wallMid = shadeColor(building.color, -34);
        const roofCol = shadeColor(building.color, 18);

        // ground shadow, stretched opposite to the lean
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.beginPath();
        ctx.ellipse(cx - ox * 0.35, by + bh + 6, bw * 0.62, bh * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // ——— side wall (left or right depending on which one faces the camera) ———
        const sideX = ox > 0 ? bx : bx + bw;
        ctx.beginPath();
        ctx.moveTo(sideX, by);
        ctx.lineTo(sideX + ox, topY);
        ctx.lineTo(sideX + ox, topY + bh);
        ctx.lineTo(sideX, by + bh);
        ctx.closePath();
        const sideGrad = ctx.createLinearGradient(sideX, topY, sideX, by + bh);
        sideGrad.addColorStop(0, wallMid);
        sideGrad.addColorStop(1, wallDark);
        ctx.fillStyle = sideGrad;
        ctx.fill();

        // ——— front facade ———
        ctx.beginPath();
        ctx.moveTo(bx, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw + ox, topY + bh);
        ctx.lineTo(bx + ox, topY + bh);
        ctx.closePath();
        const faceGrad = ctx.createLinearGradient(bx, topY, bx, by + bh);
        faceGrad.addColorStop(0, building.color + 'DD');
        faceGrad.addColorStop(0.6, shadeColor(building.color, -18));
        faceGrad.addColorStop(1, wallDark);
        ctx.fillStyle = faceGrad;
        ctx.fill();
        ctx.strokeStyle = isNear ? '#FFD700' : building.color;
        ctx.lineWidth = isNear ? 3 : 1.5;
        if (isNear) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 22; }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ——— windows mapped onto the leaning facade ———
        if (building.type !== 'decoration') {
          const cols = Math.max(2, Math.floor(bw / 46));
          const rows = Math.max(2, Math.floor(H / 46));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const v0 = (r + 0.35) / rows, v1 = (r + 0.8) / rows;   // 0 = ground, 1 = roof
              const u0 = (c + 0.28) / cols, u1 = (c + 0.78) / cols;
              const pt = (u: number, v: number) => [bx + u * bw + ox * v, by + bh - v * H + oy * v] as const;
              const lit = ((building.x + building.y) / 7 + r * 3 + c * 5) % 5 > 1.4;
              const flick = 0.35 + Math.abs(Math.sin(time * 0.6 + r + c + building.x)) * 0.45;
              ctx.beginPath();
              const [ax, ay] = pt(u0, v0); const [bx2, by2] = pt(u1, v0);
              const [cx2, cy2] = pt(u1, v1); const [dx2, dy2] = pt(u0, v1);
              ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.lineTo(cx2, cy2); ctx.lineTo(dx2, dy2);
              ctx.closePath();
              ctx.fillStyle = lit ? `rgba(255,240,170,${flick})` : 'rgba(12,28,44,0.85)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(0,0,0,0.35)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // ——— door on the facade ———
        ctx.fillStyle = 'rgba(20,14,8,0.92)';
        ctx.beginPath();
        ctx.roundRect(cx - 15, by + bh - 40, 30, 40, [8, 8, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = isNear ? '#FFD700' : shadeColor(building.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();

        // ——— roof / top face ———
        ctx.beginPath();
        ctx.moveTo(bx + ox, topY);
        ctx.lineTo(bx + bw + ox, topY);
        ctx.lineTo(bx + bw + ox, topY + bh);
        ctx.lineTo(bx + ox, topY + bh);
        ctx.closePath();
        const roofGrad = ctx.createLinearGradient(bx + ox, topY, bx + bw + ox, topY + bh);
        roofGrad.addColorStop(0, roofCol);
        roofGrad.addColorStop(1, shadeColor(building.color, -10));
        ctx.fillStyle = roofGrad;
        ctx.fill();
        ctx.strokeStyle = shadeColor(building.color, 55);
        ctx.lineWidth = 2;
        ctx.stroke();

        // roof detail — vents / antenna / neon rim
        ctx.strokeStyle = 'rgba(0,212,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + ox + 10, topY + 10, bw - 20, bh - 20);
        if (building.type === 'tower') {
          const blink = 0.4 + Math.abs(Math.sin(time * 2)) * 0.6;
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx + ox, topY + bh / 2); ctx.lineTo(cx + ox, topY - 55); ctx.stroke();
          ctx.fillStyle = `rgba(255,70,70,${blink})`;
          ctx.beginPath(); ctx.arc(cx + ox, topY - 58, 6, 0, Math.PI * 2); ctx.fill();
        }

        // ——— emoji sign floating over the roof ———
        const bob = Math.sin(time * 1.6 + building.x) * 4;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(building.emoji, cx + ox, topY + bh / 2 + 10 + bob);

        // ——— name plate at street level ———
        ctx.fillStyle = '#fff';
        ctx.font = isNear ? 'bold 14px Arial' : '12px Arial';
        ctx.shadowColor = building.color;
        ctx.shadowBlur = isNear ? 10 : 4;
        ctx.fillText(building.name, cx, by + bh + 20);
        ctx.shadowBlur = 0;

        // ——— CMKR 🦉 availability badge ———
        if (building.reward) {
          const used = cmkrToday[building.id] || 0;
          const left = Math.max(0, CMKR_DAILY_PER_PLACE - used);
          const owlLeft = left > 0 && cmkrGlobal < CMKR_MONTHLY_CAP;
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = owlLeft ? '#00FF88' : '#64748b';
          ctx.fillText(owlLeft ? `🦉 ${left}/${CMKR_DAILY_PER_PLACE} CMKR LEFT TODAY` : '🦉 daily 5 mined', cx + ox, topY - 12);
        }

        // ——— interaction prompt ———
        if (building.reward && isNear) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(`⚡ PRESS E/SPACE (+${building.reward} 💎)`, cx, by + bh + 38);

          const cooldownLeft = workCooldowns[building.id] ?
            Math.max(0, (building.cooldownMs || 10000) - (Date.now() - workCooldowns[building.id])) : 0;
          if (cooldownLeft > 0) {
            ctx.fillStyle = '#FF6666';
            ctx.fillText(`⏳ ${Math.ceil(cooldownLeft / 1000)}s`, cx, by + bh + 53);
          }
        }
      });

      /* ---------- district labels (drawn above buildings so they stay readable) ---------- */
      DISTRICTS.forEach(d => {
        const lx = d.x + 22, ly = d.y + 38;
        if (!inView(d.x + d.w / 2, d.y + d.h / 2) && !inView(lx, ly)) return;
        ctx.textAlign = 'left';
        ctx.font = 'bold 22px Arial';
        const w = ctx.measureText(d.label).width;
        ctx.fillStyle = 'rgba(4,12,22,0.72)';
        ctx.beginPath();
        ctx.roundRect(lx - 12, ly - 26, w + 24, 36, 10);
        ctx.fill();
        ctx.strokeStyle = d.color + '66';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 12;
        ctx.fillText(d.label, lx, ly);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
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
        drawBull(ctx, player.x, player.y, player.color, player.direction, player.username, false, otherArt.current[player.user_id] || null);
      });

      // Draw current player
      drawBull(ctx, myPosition.x, myPosition.y, myColor, myDirection, myBull?.name || username, true, bullArt.current);

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

      // Cinematic post-pass: neon bloom tint + vignette
      const bloom = ctx.createRadialGradient(VIEWPORT_W / 2, VIEWPORT_H / 2, VIEWPORT_H * 0.15, VIEWPORT_W / 2, VIEWPORT_H / 2, VIEWPORT_H * 0.85);
      bloom.addColorStop(0, 'rgba(34,211,238,0.05)');
      bloom.addColorStop(1, 'rgba(2,6,16,0.55)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);


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
  }, [gameActive, players, diamonds, myPosition, myDirection, myColor, username, userId, nearBuilding, cameraOffset, workCooldowns, isWorking, cmkrMined, cmkrToday, cmkrGlobal]);

  const drawBull = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, direction: string, name: string | null, isMe: boolean, art?: HTMLImageElement | null) => {
    const scale = 1.6;

    /* real CNFT artwork avatar */
    if (art) {
      const R = isMe ? 40 : 34;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + R * 0.85, R * 0.75, R * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.drawImage(art, x - R, y - R, R * 2, R * 2);
      ctx.restore();
      ctx.strokeStyle = isMe ? '#FFD700' : (color || '#00D4FF');
      ctx.lineWidth = 3;
      ctx.shadowColor = isMe ? '#FFD700' : (color || '#00D4FF');
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = isMe ? 'bold 13px Arial' : '11px Arial';
      ctx.textAlign = 'center';
      const label = name || 'Player';
      const lw = ctx.measureText(label).width + 14;
      const ny = y - R - 16;
      ctx.fillStyle = isMe ? 'rgba(255, 153, 0, 0.9)' : 'rgba(30, 41, 59, 0.9)';
      ctx.strokeStyle = isMe ? '#FF9900' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - lw / 2, ny - 7, lw, 18, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isMe ? '#000' : '#fff';
      ctx.fillText(label, x, ny + 5);
      return;
    }
    
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

  /* ——— Bull selection gate ——— */
  if (!gameActive || !myBull) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#071427] to-slate-950 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate('/games/bull-world')} className="gap-2 text-cyan-300">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300 bg-clip-text text-transparent">
              ENTER BULL CITY
            </h1>
            <p className="text-cyan-200/60 text-sm">Select the Bull that walks the city. Your CNFT is your avatar.</p>
          </div>

          {heldBulls.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <Sparkles className="w-10 h-10 mx-auto animate-spin text-cyan-400" />
              <p className="text-cyan-200/60 text-sm">Scanning your wallet for Cardano Stake Bulls…</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {heldBulls.map((b: HeldCsbBull) => (
              <Card key={b.nft_id}
                onClick={() => enterCityWithBull({ nft_id: b.nft_id, name: b.nft_name, image: b.image, level: b.level })}
                className="cursor-pointer p-3 bg-slate-900/80 border-2 border-cyan-500/40 hover:border-cyan-300 hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center mb-2">
                  {b.image
                    ? <img src={b.image} alt={`${b.nft_name} Cardano Stake Bull NFT city avatar`} loading="lazy" className="w-full h-full object-cover" />
                    : <span className="text-5xl">🐂</span>}
                </div>
                <div className="font-bold text-sm text-cyan-300">{b.nft_name}</div>
                <div className="text-xs text-amber-300">Lv {b.level} · Legendary</div>
              </Card>
            ))}
            <Card onClick={() => enterCityWithBull({ nft_id: null, name: username || 'Guest Bull', level: 1 })}
              className="cursor-pointer p-3 bg-slate-900/80 border-2 border-slate-600 hover:border-slate-300 hover:scale-105 transition-all">
              <div className="aspect-square rounded-lg bg-slate-800 flex items-center justify-center mb-2 text-5xl grayscale">🐂</div>
              <div className="font-bold text-sm text-slate-300">Guest Bull</div>
              <div className="text-xs text-slate-500">Lv 1 · No NFT needed</div>
            </Card>
          </div>
          <p className="text-center text-xs text-cyan-200/40">Free entry — mine 🦉 CMKR at every place, 5 owls per place each day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050b18] via-[#071427] to-[#050b18] p-3 md:p-4">
      <div className="max-w-[1800px] mx-auto">
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
            🐂 Cardano Stake Bulls · City
          </h1>
          <p className="text-cyan-200/50 text-xs md:text-sm">A living 3D Cardano landscape harbours, tech parks, governance halls and neon towers. Mine 🦉 <span className="text-amber-300 font-semibold">CMKR</span> at all {BUILDINGS.filter(b => b.reward).length} places up to 5 owls per place, every day.</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-2 md:gap-3 mb-3 flex-wrap">
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-slate-900/70 border-cyan-500/30">
            <Users className="w-4 h-4 text-cyan-300" />
            <span className="text-white text-sm">{players.length} Online</span>
          </Card>
          <Card className="px-3 py-1.5 flex items-center gap-2 bg-slate-900/70 border-amber-400/40">
            <span className="text-base leading-none">🦉</span>
            <span className="text-amber-200 text-sm font-bold">
              {Object.values(cmkrToday).reduce((s, n) => s + n, 0)} today · {cmkrMyMonth} this month
            </span>
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
            style={{ maxHeight: '82vh' }}
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

          {/* auto-mine toggle — sits right above the mine button */}
          <button
            onClick={() => setAutoMine(a => !a)}
            className={`absolute bottom-28 right-4 w-20 h-11 rounded-full text-[11px] font-black border-2 transition-transform active:scale-90 flex flex-col items-center justify-center leading-tight ${
              autoMine
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-200 text-black shadow-[0_0_24px_rgba(52,211,153,0.6)] animate-pulse'
                : 'bg-slate-900/70 border-slate-600 text-slate-300'
            }`}
          >
            <span>🤖 AUTO</span>
            <span className="text-[9px] opacity-80">{autoMine ? 'MINING ON' : 'OFF'}</span>
          </button>

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


        {/* CMKR mining board */}
        <Card className="p-4 mt-3 bg-gradient-to-br from-[#10233a] to-[#0d1a2c] border-amber-400/30">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h3 className="font-bold text-amber-300 flex items-center gap-2">🦉 CMKR Mining · {CMKR_MONTH}</h3>
            <span className="text-xs text-amber-200/70">
              {cmkrGlobal.toLocaleString()} / {CMKR_MONTHLY_CAP.toLocaleString()} CMKR minted
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-200"
              style={{ width: `${Math.min(100, (cmkrGlobal / CMKR_MONTHLY_CAP) * 100)}%` }} />
          </div>
          <p className="text-xs text-cyan-200/60 mb-3">
            Every place gives up to <span className="text-amber-300 font-semibold">5 🦉 CMKR per player, per day</span> — mine all {BUILDINGS.filter(b => b.reward).length} places daily for up to {BUILDINGS.filter(b => b.reward).length * CMKR_DAILY_PER_PLACE} owls a day.
            <span className="text-amber-300 font-semibold"> Everyone who mines</span> is listed below and paid out in the Discord channel by Nick G.
          </p>

          <h4 className="text-sm font-bold text-white/90 mb-2">🏆 Monthly CMKR Leaderboard · {cmkrBoard.length} miners</h4>
          {cmkrBoard.length === 0 ? (
            <p className="text-xs text-white/50">No owls mined yet this month — be the first 🦉</p>
          ) : (
            <div className="space-y-1">
              {cmkrBoard.map((r, i) => (
                <div key={r.user_id}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${r.user_id === userId ? 'bg-amber-400/15 border border-amber-400/40' : 'bg-slate-900/50'}`}>
                  <span className="flex items-center gap-2 text-white/85">
                    <span className="w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    {r.username}
                  </span>
                  <span className="text-amber-300 font-bold">🦉 {r.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Buildings Guide */}
        <Card className="p-4 mt-3 bg-[#0d2640] border-[#FF9900]/30">
          <h3 className="font-bold text-[#FF9900] mb-2">🏗️ City Buildings · Mining Spots (5 🦉 each per day)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {BUILDINGS.filter(b => b.reward).map(b => {
              const used = cmkrToday[b.id] || 0;
              const done = used >= CMKR_DAILY_PER_PLACE;
              return (
                <div key={b.id} className={`flex items-center gap-2 rounded-md px-2 py-1 ${done ? 'bg-slate-800/40 text-white/40' : 'text-white/80'}`}>
                  <span>{b.emoji}</span>
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className={done ? 'text-white/30' : 'text-amber-300'}>{done ? '✓ 🦉' : `🦉 ${used}/${CMKR_DAILY_PER_PLACE}`}</span>
                  <span className="text-[#00D4FF] text-xs">+{b.reward}💎</span>
                </div>
              );
            })}
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
