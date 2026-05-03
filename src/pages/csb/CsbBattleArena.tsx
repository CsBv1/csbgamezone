import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Swords, Shield, Heart, Zap, Coins, Trophy, RotateCcw, Users, Bot, Loader2, Sparkles, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const RARITY_GRAD: Record<string, string> = {
  common: "from-slate-700 to-slate-900",
  rare: "from-blue-700 to-indigo-900",
  epic: "from-purple-700 to-fuchsia-900",
  legendary: "from-amber-600 to-rose-800",
};

interface CsbBull {
  nft_id: string;
  nft_name: string;
  rarity: string;
  level: number;
  image?: string;
}

interface Fighter {
  name: string;
  image?: string;
  rarity: string;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  special: number;
  critChance: number;
}

interface BLog { text: string; type: 'attack' | 'defend' | 'special' | 'crit' | 'info' }

function buildFromBull(b: CsbBull): Fighter {
  const rBase = RARITY_BASE[b.rarity] || 1;
  const lvl = b.level;
  return {
    name: b.nft_name,
    image: b.image,
    rarity: b.rarity,
    level: lvl,
    maxHp: Math.floor(180 * rBase + lvl * 25),
    hp: Math.floor(180 * rBase + lvl * 25),
    attack: Math.floor(22 * rBase + lvl * 4),
    defense: Math.floor(14 * rBase + lvl * 2.5),
    special: Math.floor(20 * rBase + lvl * 3.5),
    critChance: Math.min(35, 5 + Math.floor(lvl * 1.5)),
  };
}

const AI_NAMES = ['Shadow Bull', 'Iron Horn', 'Crimson Charger', 'Frost Hoof', 'Thunder Stomp', 'Dark Taurus'];
function buildAI(playerLvl: number, playerRarity: string): Fighter {
  const rarities = ['common', 'rare', 'epic', 'legendary'];
  const rIdx = Math.min(3, rarities.indexOf(playerRarity) + (Math.random() < 0.3 ? 1 : 0));
  const rarity = rarities[Math.max(0, rIdx)];
  const aiLvl = Math.max(1, playerLvl + Math.floor(Math.random() * 3) - 1);
  const fake: CsbBull = {
    nft_id: 'ai', nft_name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    rarity, level: aiLvl,
  };
  return buildFromBull(fake);
}

type GameState = 'select' | 'fighting' | 'victory' | 'defeat';
type Mode = 'ai' | 'pvp';

export default function CsbBattleArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const initialMode = (params.get('mode') as Mode) || 'ai';

  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player: csbPlayer, userId, addBalance } = useCsbv1();
  const logRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<GameState>('select');
  const [me, setMe] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [turn, setTurn] = useState<'me' | 'foe'>('me');
  const [log, setLog] = useState<BLog[]>([]);
  const [animating, setAnimating] = useState(false);
  const [specialReady, setSpecialReady] = useState(0);
  const [meShake, setMeShake] = useState(false);
  const [foeShake, setFoeShake] = useState(false);
  const [wins, setWins] = useState(0);

  // PvP
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [searching, setSearching] = useState(false);
  const channelRef = useRef<any>(null);
  const queueTimerRef = useRef<any>(null);
  const [username, setUsername] = useState('Fighter');

  // Load bulls + username
  useEffect(() => {
    const loadBulls = async () => {
      if (!userId) return;
      const { data } = await supabase.from('csbv1_nft_power' as any).select('*').eq('user_id', userId).order('nft_id');
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith('csb_'));
      const merged = rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const numMatch = (r.nft_name || '').match(/(\d+)\s*$/);
        const num = numMatch ? numMatch[1] : String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` } as CsbBull;
      });
      setBulls(merged);
      const { data: prof } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
      if (prof?.username) setUsername(prof.username);
    };
    loadBulls();
  }, [userId, walletNfts.length]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Cleanup
  useEffect(() => () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    if (roomId && userId) supabase.from('game_room_players').delete().eq('room_id', roomId).eq('user_id', userId);
  }, [roomId, userId]);

  // ================== AI ==================
  const startAI = (bull: CsbBull) => {
    setSelected(bull);
    const m = buildFromBull(bull);
    const f = buildAI(bull.level, bull.rarity);
    setMe(m); setFoe(f);
    setLog([{ text: `⚔️ ${m.name} (Lv ${m.level}) VS ${f.name} (Lv ${f.level})!`, type: 'info' }]);
    setTurn('me'); setSpecialReady(0); setState('fighting');
  };

  // ================== PvP ==================
  const startPvP = async (bull: CsbBull) => {
    if (!userId) return;
    setSelected(bull);
    setSearching(true);
    setQueueTime(0);
    queueTimerRef.current = setInterval(() => setQueueTime((t) => t + 1), 1000);

    const { data: openRooms } = await supabase
      .from('game_rooms').select('id')
      .eq('game_type', 'csb-battle').eq('status', 'waiting').limit(1);

    if (openRooms && openRooms.length > 0) {
      const r = openRooms[0];
      setRoomId(r.id); setIsHost(false);
      await supabase.from('game_room_players').insert({
        room_id: r.id, user_id: userId, username, is_active: true,
      });
      await supabase.from('game_rooms').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', r.id);
      subscribeRoom(r.id, bull);
    } else {
      const { data: nr } = await supabase.from('game_rooms').insert({
        game_type: 'csb-battle', status: 'waiting', max_players: 2,
      }).select('id').single();
      if (nr) {
        setRoomId(nr.id); setIsHost(true);
        await supabase.from('game_room_players').insert({
          room_id: nr.id, user_id: userId, username, is_active: true,
        });
        subscribeRoom(nr.id, bull);
      }
    }
  };

  const subscribeRoom = (rId: string, myBull: CsbBull) => {
    const ch = supabase
      .channel(`csb-battle-${rId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_room_players', filter: `room_id=eq.${rId}`,
      }, async (payload) => {
        const p = payload.new as any;
        if (p && p.user_id !== userId && p.is_active) {
          if (queueTimerRef.current) clearInterval(queueTimerRef.current);
          // Build approximated opponent fighter from a pseudo-random level matched to mine
          const oppFake: CsbBull = {
            nft_id: 'opp', nft_name: p.username || 'Opponent',
            rarity: myBull.rarity, level: myBull.level,
          };
          const m = buildFromBull(myBull);
          const f = buildFromBull(oppFake);
          setMe(m); setFoe(f);
          setLog([{ text: `⚔️ PvP! ${m.name} VS ${f.name}!`, type: 'info' }]);
          setTurn('me'); setSpecialReady(0);
          setSearching(false);
          setState('fighting');
        }
      })
      .on('broadcast', { event: 'csb-action' }, (payload) => {
        const d = payload.payload as any;
        if (d.from === userId) return;
        if (d.action === 'attack' || d.action === 'special') {
          setMe((prev) => {
            if (!prev) return prev;
            const newHp = Math.max(0, prev.hp - (d.damage || 0));
            if (newHp <= 0) setTimeout(() => onDefeat(), 500);
            return { ...prev, hp: newHp };
          });
          setMeShake(true); setTimeout(() => setMeShake(false), 300);
          setLog((prev) => [...prev, { text: d.logText || `Opponent hits for ${d.damage}`, type: d.action === 'special' ? 'special' : 'attack' }]);
          setTurn('me');
        } else if (d.action === 'defend') {
          setFoe((prev) => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + (d.heal || 0)) } : prev);
          setLog((prev) => [...prev, { text: d.logText || `Opponent defends`, type: 'defend' }]);
          setTurn('me');
        }
      })
      .subscribe();
    channelRef.current = ch;
  };

  const broadcast = (action: string, data: any) => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'csb-action', payload: { from: userId, action, ...data } });
    }
  };

  const cancelQueue = async () => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (roomId && userId) {
      await supabase.from('game_room_players').delete().eq('room_id', roomId).eq('user_id', userId);
      if (isHost) await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomId);
    }
    setRoomId(null); setSearching(false);
  };

  // ================== Combat ==================
  const enemyTurn = (curFoe: Fighter, curMe: Fighter) => {
    const action = Math.random();
    let nm = { ...curMe };
    let l: BLog;
    if (action < 0.7) {
      const isCrit = Math.random() * 100 < curFoe.critChance;
      let dmg = Math.max(3, curFoe.attack - curMe.defense / 2 + Math.floor(Math.random() * 8));
      if (isCrit) dmg = Math.floor(dmg * 1.6);
      nm.hp = Math.max(0, nm.hp - dmg);
      setMeShake(true); setTimeout(() => setMeShake(false), 300);
      l = isCrit
        ? { text: `💥 ${curFoe.name} crits for ${dmg}!`, type: 'crit' }
        : { text: `👊 ${curFoe.name} attacks for ${dmg}!`, type: 'attack' };
    } else {
      const heal = Math.floor(curFoe.defense * 0.4 + 4);
      const nf = { ...curFoe, hp: Math.min(curFoe.maxHp, curFoe.hp + heal) };
      setFoe(nf);
      l = { text: `🛡️ ${curFoe.name} defends and heals ${heal}!`, type: 'defend' };
    }
    setMe(nm); setLog((p) => [...p, l]);
    if (nm.hp <= 0) setTimeout(() => onDefeat(), 500);
    else setTimeout(() => setTurn('me'), 400);
  };

  const doAttack = useCallback(() => {
    if (!me || !foe || turn !== 'me' || animating) return;
    setAnimating(true);
    const isCrit = Math.random() * 100 < me.critChance;
    let dmg = Math.max(5, me.attack - foe.defense / 2 + Math.floor(Math.random() * 10));
    if (isCrit) dmg = Math.floor(dmg * 1.8);
    const nf = { ...foe, hp: Math.max(0, foe.hp - dmg) };
    setFoe(nf); setFoeShake(true); setTimeout(() => setFoeShake(false), 300);
    setSpecialReady((s) => Math.min(100, s + 20));
    const txt = isCrit ? `💥 CRITICAL! ${me.name} deals ${dmg}!` : `⚔️ ${me.name} attacks for ${dmg}!`;
    setLog((p) => [...p, { text: txt, type: isCrit ? 'crit' : 'attack' }]);
    if (mode === 'pvp') { broadcast('attack', { damage: dmg, logText: txt }); setTurn('foe'); }
    if (nf.hp <= 0) setTimeout(() => onVictory(), 500);
    else if (mode === 'ai') setTimeout(() => { setTurn('foe'); enemyTurn(nf, me); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, mode]);

  const doSpecial = useCallback(() => {
    if (!me || !foe || turn !== 'me' || animating || specialReady < 100) return;
    setAnimating(true);
    const dmg = Math.floor(me.special * 2.5 + Math.random() * 20);
    const nf = { ...foe, hp: Math.max(0, foe.hp - dmg) };
    setFoe(nf); setFoeShake(true); setTimeout(() => setFoeShake(false), 400);
    setSpecialReady(0);
    const txt = `🌟 SPECIAL STRIKE! ${dmg} damage!`;
    setLog((p) => [...p, { text: txt, type: 'special' }]);
    if (mode === 'pvp') { broadcast('special', { damage: dmg, logText: txt }); setTurn('foe'); }
    if (nf.hp <= 0) setTimeout(() => onVictory(), 500);
    else if (mode === 'ai') setTimeout(() => { setTurn('foe'); enemyTurn(nf, me); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, specialReady, mode]);

  const doDefend = useCallback(() => {
    if (!me || !foe || turn !== 'me' || animating) return;
    setAnimating(true);
    const heal = Math.floor(me.defense * 0.5 + 5);
    const nm = { ...me, hp: Math.min(me.maxHp, me.hp + heal) };
    setMe(nm); setSpecialReady((s) => Math.min(100, s + 10));
    const txt = `🛡️ ${me.name} defends and heals ${heal}!`;
    setLog((p) => [...p, { text: txt, type: 'defend' }]);
    if (mode === 'pvp') { broadcast('defend', { heal, logText: txt }); setTurn('foe'); }
    else setTimeout(() => { setTurn('foe'); enemyTurn(foe, nm); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, mode]);

  const onVictory = async () => {
    setState('victory');
    setWins((w) => w + 1);
    if (!me) return;
    const baseReward = 25 + me.level * 10;
    const rarityMult = RARITY_BASE[me.rarity] || 1;
    const modeMult = mode === 'pvp' ? 3 : 1;
    const reward = Math.floor(baseReward * rarityMult * modeMult);
    await addBalance(reward);
    if (userId) {
      await supabase.from('game_results').insert({
        user_id: userId, game_name: 'CSB Battle Arena', result: 'win', diamonds_won: 0,
      });
    }
    if (roomId) await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomId);
    setLog((p) => [...p, { text: `🏆 VICTORY! +${reward} 🪙 $CsBv1!${mode === 'pvp' ? ' (PvP 3x)' : ''}`, type: 'info' }]);
    toast({ title: 'Victory! 🏆', description: `+${reward} $CsBv1 earned` });
  };

  const onDefeat = async () => {
    setState('defeat');
    if (userId) {
      await supabase.from('game_results').insert({
        user_id: userId, game_name: 'CSB Battle Arena', result: 'loss', diamonds_won: 0,
      });
    }
    if (roomId) await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomId);
    setLog((p) => [...p, { text: `💀 DEFEATED! Train more in NFT Power.`, type: 'info' }]);
  };

  const backToSelect = () => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setRoomId(null); setMe(null); setFoe(null); setLog([]); setState('select'); setSelected(null);
  };

  const logColor = (t: string) => ({
    crit: 'text-red-400 font-bold',
    special: 'text-purple-400 font-bold',
    defend: 'text-green-400',
    info: 'text-yellow-400 font-bold',
    attack: 'text-cyan-300',
  } as any)[t] || 'text-cyan-300';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {csbPlayer?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-red-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            ⚔️ CSB BULL BATTLE ARENA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Battle with your leveled bulls. Win <span className="text-amber-300">$CsBv1</span> · {mode === 'pvp' ? '1v1 Multiplayer (3x rewards)' : 'Single-Player vs AI'}
          </p>
          {wins > 0 && <Badge className="bg-yellow-600 mt-2">{wins} Win Streak 🔥</Badge>}
        </div>

        {/* Mode toggle */}
        {state === 'select' && !searching && (
          <div className="flex justify-center gap-2">
            <Button variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>
              <Bot className="w-4 h-4 mr-1" /> Single Player
            </Button>
            <Button variant={mode === 'pvp' ? 'default' : 'outline'} onClick={() => setMode('pvp')}>
              <Users className="w-4 h-4 mr-1" /> Multiplayer PvP
            </Button>
          </div>
        )}

        {/* Searching overlay */}
        {searching && (
          <Card className="bg-slate-900/80 border-purple-700 p-6 text-center max-w-md mx-auto space-y-3">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
            <h3 className="text-lg font-bold">Searching for opponent...</h3>
            <p className="font-mono text-purple-300">{Math.floor(queueTime / 60)}:{String(queueTime % 60).padStart(2, '0')}</p>
            <Button variant="outline" onClick={cancelQueue}>Cancel</Button>
          </Card>
        )}

        {/* Bull selection */}
        {state === 'select' && !searching && (
          <>
            {bulls.length === 0 ? (
              <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">No CSB Bulls detected. Hold a bull and visit NFT Power to register them.</p>
                <Button onClick={() => navigate('/csb/nft-power')}>Go to NFT Power</Button>
              </Card>
            ) : (
              <div>
                <h2 className="text-lg font-bold mb-3 text-center">Pick your fighter</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {bulls.map((b) => {
                    const previewStats = buildFromBull(b);
                    return (
                      <Card key={b.nft_id}
                        className={`p-3 bg-gradient-to-br ${RARITY_GRAD[b.rarity] || RARITY_GRAD.common} border-2 border-white/10 cursor-pointer hover:scale-[1.02] transition-transform`}
                        onClick={() => mode === 'ai' ? startAI(b) : startPvP(b)}>
                        <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                          {b.image ? (
                            <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" />
                          ) : (
                            <Crown className="w-10 h-10 text-amber-300" />
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                        <div className="font-bold text-sm">{b.nft_name}</div>
                        <div className="text-xs opacity-90">Lv {b.level}</div>
                        <div className="text-[11px] mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                          <span>❤️ {previewStats.maxHp}</span>
                          <span>⚔️ {previewStats.attack}</span>
                          <span>🛡️ {previewStats.defense}</span>
                          <span>⚡ {previewStats.special}</span>
                        </div>
                        <Button size="sm" className="w-full mt-2">
                          {mode === 'ai' ? <><Bot className="w-3 h-3 mr-1" /> Fight AI</> : <><Users className="w-3 h-3 mr-1" /> Find Match</>}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Battle UI */}
        {(state === 'fighting' || state === 'victory' || state === 'defeat') && me && foe && (
          <div className="space-y-2 max-w-lg mx-auto">
            <Card className={`bg-slate-900/80 border-red-800/40 p-3`}
                  style={foeShake ? { animation: 'csb-shake 0.3s ease-in-out' } : {}}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-red-400 font-bold text-sm">{mode === 'pvp' ? '🎮' : '👹'} {foe.name} <span className="text-xs opacity-70">Lv {foe.level}</span></span>
                <span className="text-[10px] uppercase tracking-widest text-cyan-300">{foe.rarity}</span>
              </div>
              <Progress value={(foe.hp / foe.maxHp) * 100} className="h-3" />
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span><Heart className="w-3 h-3 inline text-red-400" /> {foe.hp}/{foe.maxHp}</span>
                <span><Swords className="w-3 h-3 inline text-orange-400" /> {foe.attack} <Shield className="w-3 h-3 inline text-blue-400" /> {foe.defense}</span>
              </div>
            </Card>

            <div className="relative h-40 bg-gradient-to-r from-red-950/40 via-slate-900 to-blue-950/40 rounded-xl border border-slate-800 flex items-center justify-around overflow-hidden">
              <div className={`text-center transition-all ${meShake ? 'animate-bounce' : ''}`}>
                {me.image ? <img src={me.image} alt={me.name} className="w-20 h-20 rounded-lg object-cover ring-2 ring-cyan-400/60" /> : <div className="text-5xl">🐂</div>}
                <p className="text-cyan-400 text-xs font-bold mt-1">{me.name}</p>
              </div>
              <div className="text-3xl text-yellow-400 font-black animate-pulse">VS</div>
              <div className={`text-center transition-all ${foeShake ? 'animate-bounce' : ''}`}>
                {foe.image ? <img src={foe.image} alt={foe.name} className="w-20 h-20 rounded-lg object-cover ring-2 ring-red-400/60" /> : <div className="text-5xl">{mode === 'pvp' ? '🐂' : '👹'}</div>}
                <p className="text-red-400 text-xs font-bold mt-1">{foe.name}</p>
              </div>
            </div>

            <Card className="bg-slate-900/80 border-cyan-800/40 p-3"
                  style={meShake ? { animation: 'csb-shake 0.3s ease-in-out' } : {}}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-400 font-bold text-sm">🐂 {me.name} <span className="text-xs opacity-70">Lv {me.level}</span></span>
                <span className="text-[10px] uppercase tracking-widest text-cyan-300">{me.rarity}</span>
              </div>
              <Progress value={(me.hp / me.maxHp) * 100} className="h-3" />
              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                <span><Heart className="w-3 h-3 inline text-red-400" /> {me.hp}/{me.maxHp}</span>
                <span><Swords className="w-3 h-3 inline text-orange-400" /> {me.attack} <Shield className="w-3 h-3 inline text-blue-400" /> {me.defense} <Zap className="w-3 h-3 inline text-purple-400" /> {me.special}</span>
              </div>
              <div className="mt-1">
                <div className="text-xs text-purple-400">Special: {specialReady}%</div>
                <Progress value={specialReady} className="h-1.5 mt-0.5" />
              </div>
            </Card>

            {state === 'fighting' && (
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={doAttack} disabled={turn !== 'me' || animating}
                  className="bg-gradient-to-b from-red-600 to-red-800 h-14 flex-col text-xs">
                  <Swords className="w-5 h-5" /> Attack
                </Button>
                <Button onClick={doDefend} disabled={turn !== 'me' || animating}
                  className="bg-gradient-to-b from-blue-600 to-blue-800 h-14 flex-col text-xs">
                  <Shield className="w-5 h-5" /> Defend
                </Button>
                <Button onClick={doSpecial} disabled={turn !== 'me' || animating || specialReady < 100}
                  className={`h-14 flex-col text-xs ${specialReady >= 100 ? 'bg-gradient-to-b from-purple-600 to-purple-800 animate-pulse' : 'bg-slate-700'}`}>
                  <Zap className="w-5 h-5" /> Special
                </Button>
              </div>
            )}

            {(state === 'victory' || state === 'defeat') && (
              <div className="flex gap-2">
                {mode === 'ai' && selected && (
                  <Button onClick={() => startAI(selected)} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 h-12">
                    <RotateCcw className="w-4 h-4 mr-1" /> {state === 'victory' ? 'Next Fight' : 'Rematch'}
                  </Button>
                )}
                <Button onClick={backToSelect} variant="outline" className="flex-1 h-12">Pick Bull</Button>
              </div>
            )}

            <Badge className={turn === 'me' ? 'bg-cyan-700' : 'bg-red-700'}>
              {turn === 'me' ? '🎮 Your Turn' : (mode === 'pvp' ? '⏳ Opponent\'s Turn' : '👹 Enemy Turn')}
            </Badge>

            <Card className="bg-slate-950/80 border-slate-800 p-2 max-h-32 overflow-y-auto" ref={logRef}>
              {log.map((l, i) => (<p key={i} className={`text-xs ${logColor(l.type)}`}>{l.text}</p>))}
            </Card>
          </div>
        )}

        <style>{`@keyframes csb-shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-6px);} 75%{transform:translateX(6px);} }`}</style>
      </div>
    </div>
  );
}
