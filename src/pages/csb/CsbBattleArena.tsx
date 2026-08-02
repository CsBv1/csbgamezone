import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  exp?: number;
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
  const stateRef = useRef<GameState>('select');
  useEffect(() => { stateRef.current = state; }, [state]);
  const [me, setMe] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [turn, setTurn] = useState<'me' | 'foe'>('me');
  const [log, setLog] = useState<BLog[]>([]);
  const [animating, setAnimating] = useState(false);
  const [specialReady, setSpecialReady] = useState(0);
  const [meShake, setMeShake] = useState(false);
  const [foeShake, setFoeShake] = useState(false);
  const [wins, setWins] = useState(0);
  const [aiProxy, setAiProxy] = useState(false);


  // PvP
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [searching, setSearching] = useState(false);
  const channelRef = useRef<any>(null);
  const queueTimerRef = useRef<any>(null);
  const acceptPollRef = useRef<any>(null);
  const matchedRef = useRef(false);

  const [username, setUsername] = useState('Fighter');

  // Challenge system
  type Challenger = { user_id: string; username: string; top_level: number; bulls_owned: number };
  const [challengers, setChallengers] = useState<Challenger[]>([]);
  const [loadingChallengers, setLoadingChallengers] = useState(false);
  const [pickingOpponent, setPickingOpponent] = useState(false);
  const [target, setTarget] = useState<Challenger | null>(null);
  const [incoming, setIncoming] = useState<{ roomId: string; fromName: string; fromLevel: number } | null>(null);
  const [incomingLeft, setIncomingLeft] = useState(30);

  // Load bulls + username
  useEffect(() => {
    const loadBulls = async () => {
      if (!userId) return;
      const { data } = await supabase.from('csbv1_nft_power' as any).select('*').eq('user_id', userId).order('nft_id');
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith('csb_') && (walletNfts.length === 0 || walletNfts.some((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`)));
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
    setMode('ai'); setRoomId(null);
    setTurn('me'); setSpecialReady(0); setAiProxy(false); setState('fighting');
  };

  // ================== PvP Challenges ==================
  const PVP_TIMEOUT_SECONDS = 30;

  const loadChallengers = async () => {
    setLoadingChallengers(true);
    const { data } = await supabase.from('csb_challengers' as any).select('*');
    const list = ((data || []) as any[])
      .filter((c) => c.user_id && c.user_id !== userId)
      .map((c) => ({
        user_id: c.user_id as string,
        username: (c.username as string) || 'Bull Holder',
        top_level: Number(c.top_level) || 1,
        bulls_owned: Number(c.bulls_owned) || 0,
      }));
    setChallengers(list);
    setLoadingChallengers(false);
  };

  const openOpponentPicker = (bull: CsbBull) => {
    setSelected(bull);
    setPickingOpponent(true);
    loadChallengers();
  };

  // Fetch an opponent's real bull image from their connected wallet
  const fetchOpponentBullImage = async (oppUserId: string): Promise<string | undefined> => {
    try {
      const { data: prof } = await supabase.from('profiles').select('wallet_address').eq('id', oppUserId).maybeSingle();
      const addr = (prof as any)?.wallet_address;
      if (!addr) return undefined;
      const { data } = await supabase.functions.invoke('scan-wallet-nfts', { body: { walletAddress: addr } });
      const list = (data?.nfts || []) as Array<{ image?: string }>;
      return list.find((n) => n.image)?.image;
    } catch {
      return undefined;
    }
  };

  // AI stands in for a real player who didn't answer, using their name + bull
  const startProxyAI = async (bull: CsbBull, opp: Challenger) => {
    const proxy: CsbBull = {
      nft_id: 'proxy',
      nft_name: `${opp.username}'s Bull`,
      rarity: bull.rarity,
      level: Math.max(1, opp.top_level),
    };
    const m = buildFromBull(bull);
    const f = buildFromBull(proxy);
    setMe(m); setFoe(f);
    setLog([
      { text: `⏱️ ${opp.username} didn't answer — AI takes control of their bull.`, type: 'info' },
      { text: `⚔️ ${m.name} (Lv ${m.level}) VS ${f.name} (Lv ${f.level})!`, type: 'info' },
    ]);
    setTurn('me'); setSpecialReady(0); setSearching(false); setAiProxy(true); setState('fighting');
    const img = await fetchOpponentBullImage(opp.user_id);
    if (img) setFoe((prev) => (prev ? { ...prev, image: img } : prev));
  };


  const challengeOpponent = async (opp: Challenger) => {
    const bull = selected;
    if (!userId || !bull) return;
    matchedRef.current = false;
    setTarget(opp);
    setPickingOpponent(false);
    setSearching(true);
    setQueueTime(0);

    const { data: nr } = await supabase.from('game_rooms').insert({
      game_type: 'csb-battle', status: 'waiting', max_players: 2, created_by: userId,
      round_data: {
        challenger_id: userId,
        challenger_name: username,
        challenger_level: bull.level,
        target_id: opp.user_id,
        target_name: opp.username,
      } as any,
    }).select('id').single();

    if (!nr) { setSearching(false); toast({ title: 'Could not send challenge' }); return; }

    setRoomId(nr.id); setIsHost(true);
    await supabase.from('game_room_players').insert({
      room_id: nr.id, user_id: userId, username, is_active: true,
    });
    subscribeRoom(nr.id, bull);
    toast({ title: `Challenge sent to ${opp.username}`, description: 'They have 30 seconds to answer.' });

    // Fallback poll: catch the accept even if realtime drops the event
    if (acceptPollRef.current) clearInterval(acceptPollRef.current);
    acceptPollRef.current = setInterval(async () => {
      if (matchedRef.current) { clearInterval(acceptPollRef.current); return; }
      const { data } = await supabase
        .from('game_room_players')
        .select('user_id, username, is_active')
        .eq('room_id', nr.id);
      const other = (data || []).find((p: any) => p.user_id !== userId && p.is_active);
      if (other) beginPvpMatch(bull, other);
    }, 1000);

    queueTimerRef.current = setInterval(() => {
      setQueueTime((t) => {
        const nt = t + 1;
        if (matchedRef.current) { clearInterval(queueTimerRef.current); return t; }
        if (nt >= PVP_TIMEOUT_SECONDS) {
          clearInterval(queueTimerRef.current);
          (async () => {
            if (matchedRef.current) return;
            matchedRef.current = true;
            if (acceptPollRef.current) clearInterval(acceptPollRef.current);
            if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
            await supabase.from('game_room_players').delete().eq('room_id', nr.id).eq('user_id', userId);
            await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', nr.id);
            setRoomId(null);
            startProxyAI(bull, opp);
          })();
        }
        return nt;
      });
    }, 1000);
  };

  const acceptChallenge = async () => {
    if (!incoming || !userId) return;
    const bull = selected || bulls[0];
    if (!bull) { toast({ title: 'No bull available' }); setIncoming(null); return; }
    const rId = incoming.roomId;
    const fromName = incoming.fromName;
    const fromLevel = incoming.fromLevel;
    setIncoming(null);
    setSelected(bull);
    setRoomId(rId); setIsHost(false);
    matchedRef.current = true;
    subscribeRoom(rId, bull);
    await supabase.from('game_room_players').insert({
      room_id: rId, user_id: userId, username, is_active: true,
    });
    await supabase.from('game_rooms').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', rId);
    // Broadcast the accept a few times — the challenger may still be subscribing
    [200, 900, 2000].forEach((d) =>
      setTimeout(() => broadcast('accept', { username, level: bull.level }), d)
    );
    const m = buildFromBull(bull);
    const f = buildFromBull({ nft_id: 'opp', nft_name: `${fromName}'s Bull`, rarity: bull.rarity, level: fromLevel || bull.level });
    setMe(m); setFoe(f);
    setLog([{ text: `⚔️ PvP! ${m.name} VS ${f.name}!`, type: 'info' }]);
    setTurn('foe'); setSpecialReady(0); setSearching(false); setAiProxy(false); setState('fighting');
    const rd: any = (await supabase.from('game_rooms').select('round_data').eq('id', rId).maybeSingle()).data?.round_data;
    if (rd?.challenger_id) {
      const img = await fetchOpponentBullImage(rd.challenger_id);
      if (img) setFoe((prev) => (prev ? { ...prev, image: img } : prev));
    }
  };


  // Listen for challenges aimed at me (+ polling fallback so both screens stay in sync)
  useEffect(() => {
    if (!userId) return;

    const offer = (r: any) => {
      const rd = r?.round_data || {};
      if (rd.target_id !== userId) return;
      setIncoming((prev) => {
        if (prev?.roomId === r.id) return prev;
        setIncomingLeft(PVP_TIMEOUT_SECONDS);
        toast({ title: `🥊 ${rd.challenger_name || 'A player'} challenged you!`, description: 'Answer within 30 seconds.' });
        return { roomId: r.id, fromName: rd.challenger_name || 'A challenger', fromLevel: Number(rd.challenger_level) || 1 };
      });
    };

    const ch = supabase
      .channel('csb-challenge-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_rooms', filter: 'game_type=eq.csb-battle' }, (payload) => offer(payload.new))
      .subscribe();

    const poll = setInterval(async () => {
      if (stateRef.current === 'fighting') return;
      const since = new Date(Date.now() - PVP_TIMEOUT_SECONDS * 1000).toISOString();
      const { data } = await supabase
        .from('game_rooms')
        .select('id, round_data, created_at')
        .eq('game_type', 'csb-battle')
        .eq('status', 'waiting')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5);
      (data || []).forEach((r: any) => {
        // Keep both screens on the same clock: remaining time is based on when the challenge was created
        const elapsed = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 1000);
        const left = PVP_TIMEOUT_SECONDS - elapsed;
        if (left <= 2) return;
        offer(r, left);
      });
    }, 1000);


    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [userId]);

  // Countdown on the accept window
  useEffect(() => {
    if (!incoming) return;
    const t = setInterval(() => {
      setIncomingLeft((s) => {
        if (s <= 1) { clearInterval(t); setIncoming(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [incoming?.roomId]);



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
          setAiProxy(false);
          setState('fighting');
          const img = await fetchOpponentBullImage(p.user_id);
          if (img) setFoe((prev) => (prev ? { ...prev, image: img } : prev));
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
    if (mode === 'pvp' && !aiProxy) { broadcast('attack', { damage: dmg, logText: txt }); setTurn('foe'); }
    if (nf.hp <= 0) setTimeout(() => onVictory(), 500);
    else if (mode === 'ai' || aiProxy) setTimeout(() => { setTurn('foe'); enemyTurn(nf, me); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, mode, aiProxy]);

  const doSpecial = useCallback(() => {
    if (!me || !foe || turn !== 'me' || animating || specialReady < 100) return;
    setAnimating(true);
    const dmg = Math.floor(me.special * 2.5 + Math.random() * 20);
    const nf = { ...foe, hp: Math.max(0, foe.hp - dmg) };
    setFoe(nf); setFoeShake(true); setTimeout(() => setFoeShake(false), 400);
    setSpecialReady(0);
    const txt = `🌟 SPECIAL STRIKE! ${dmg} damage!`;
    setLog((p) => [...p, { text: txt, type: 'special' }]);
    if (mode === 'pvp' && !aiProxy) { broadcast('special', { damage: dmg, logText: txt }); setTurn('foe'); }
    if (nf.hp <= 0) setTimeout(() => onVictory(), 500);
    else if (mode === 'ai' || aiProxy) setTimeout(() => { setTurn('foe'); enemyTurn(nf, me); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, specialReady, mode, aiProxy]);

  const doDefend = useCallback(() => {
    if (!me || !foe || turn !== 'me' || animating) return;
    setAnimating(true);
    const heal = Math.floor(me.defense * 0.5 + 5);
    const nm = { ...me, hp: Math.min(me.maxHp, me.hp + heal) };
    setMe(nm); setSpecialReady((s) => Math.min(100, s + 10));
    const txt = `🛡️ ${me.name} defends and heals ${heal}!`;
    setLog((p) => [...p, { text: txt, type: 'defend' }]);
    if (mode === 'pvp' && !aiProxy) { broadcast('defend', { heal, logText: txt }); setTurn('foe'); }
    else setTimeout(() => { setTurn('foe'); enemyTurn(foe, nm); }, 700);
    setTimeout(() => setAnimating(false), 600);
  }, [me, foe, turn, animating, mode, aiProxy]);

  // ================== EXP / Leveling ==================
  const expNeeded = (lvl: number) => 100 + (lvl - 1) * 60;

  const grantExp = async (amount: number, reason: string) => {
    if (!selected || !userId || amount <= 0) return;
    let lvl = selected.level;
    let exp = (selected.exp || 0) + amount;
    let leveled = 0;
    while (exp >= expNeeded(lvl)) {
      exp -= expNeeded(lvl);
      lvl += 1;
      leveled += 1;
    }
    const updated = { ...selected, level: lvl, exp };
    setSelected(updated);
    setBulls((prev) => prev.map((b) => (b.nft_id === selected.nft_id ? updated : b)));
    await supabase
      .from('csbv1_nft_power' as any)
      .update({ level: lvl, exp, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('nft_id', selected.nft_id);

    setLog((p) => [...p, { text: `✨ ${selected.nft_name} gained +${amount} EXP (${reason})`, type: 'info' }]);
    if (leveled > 0) {
      setLog((p) => [...p, { text: `🎉 LEVEL UP! ${selected.nft_name} is now Lv ${lvl}!`, type: 'special' }]);
      toast({ title: `🎉 Level Up! Lv ${lvl}`, description: `${selected.nft_name} grew stronger` });
    }
  };

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
    setLog((p) => [...p, { text: `🏆 VICTORY! +${reward} 🪙 Rune Power!${mode === 'pvp' ? ' (PvP 3x)' : ''}`, type: 'info' }]);
    toast({ title: 'Victory! 🏆', description: `+${reward} Rune Power earned` });
    const expGain = Math.floor((40 + (foe?.level || 1) * 12) * (mode === 'pvp' ? 2 : 1));
    await grantExp(expGain, mode === 'pvp' ? 'PvP win 2x' : 'AI training win');
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
    await grantExp(mode === 'pvp' ? 20 : 12, 'battle experience');
  };


  const backToSelect = () => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    setRoomId(null); setMe(null); setFoe(null); setLog([]); setState('select'); setSelected(null); setAiProxy(false); setTarget(null);
  };

  // "Next Fight" — re-issue the same challenge in PvP, else new AI bout
  const nextFight = async () => {
    if (!selected) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    setMe(null); setFoe(null); setLog([]); setAiProxy(false); setRoomId(null);
    if (target) {
      setMode('pvp');
      setState('select');
      await challengeOpponent(target);
    } else {
      startAI(selected);
    }
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
            <Coins className="w-4 h-4" /> {csbPlayer?.balance.toLocaleString() || 0} Rune Power
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-red-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            ⚔️ CSB BULL BATTLE ARENA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Battle with your leveled bulls. Win <span className="text-amber-300">Rune Power</span> + <span className="text-cyan-300">EXP</span> · {mode === 'pvp' ? '1v1 Multiplayer (3x rewards, 2x EXP)' : 'AI Bull Training vs AI'}
          </p>
          {wins > 0 && <Badge className="bg-yellow-600 mt-2">{wins} Win Streak 🔥</Badge>}
        </div>

        {/* Mode toggle */}
        {state === 'select' && !searching && (
          <div className="flex justify-center gap-2">
            <Button variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>
              <Bot className="w-4 h-4 mr-1" /> AI Bull Training
            </Button>
            <Button variant={mode === 'pvp' ? 'default' : 'outline'} onClick={() => setMode('pvp')}>
              <Users className="w-4 h-4 mr-1" /> Multiplayer PvP
            </Button>
          </div>
        )}

        {/* Incoming challenge popup */}
        <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) setIncoming(null); }}>
          <DialogContent className="max-w-sm bg-slate-900 border-amber-500">
            <DialogHeader>
              <DialogTitle className="text-amber-300 text-center">🥊 {incoming?.fromName} challenged you!</DialogTitle>
              <DialogDescription className="text-center">
                Their bull is Lv {incoming?.fromLevel}. Accept within {incomingLeft}s or AI will fight for them.
              </DialogDescription>
            </DialogHeader>
            <Progress value={(incomingLeft / PVP_TIMEOUT_SECONDS) * 100} className="h-2" />
            {bulls.length > 1 && (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {bulls.map((b) => (
                  <button
                    key={b.nft_id}
                    onClick={() => setSelected(b)}
                    className={`rounded-lg p-1 text-[10px] ring-2 transition ${selected?.nft_id === b.nft_id ? 'ring-amber-400 bg-amber-500/10' : 'ring-white/10 bg-black/30'}`}
                  >
                    <div className="aspect-square rounded overflow-hidden bg-black/40 mb-1 flex items-center justify-center">
                      {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-5 h-5 opacity-60" />}
                    </div>
                    <div className="truncate">{b.nft_name}</div>
                    <div className="opacity-70">Lv {b.level}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1 bg-gradient-to-r from-amber-500 to-red-500" onClick={acceptChallenge}>Accept Battle</Button>
              <Button variant="outline" className="flex-1" onClick={() => setIncoming(null)}>Decline</Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Waiting for challenged player */}
        {searching && (
          <Card className="bg-slate-900/80 border-purple-700 p-6 text-center max-w-md mx-auto space-y-3">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
            <h3 className="text-lg font-bold">Waiting for {target?.username || 'opponent'}...</h3>
            <p className="font-mono text-purple-300 text-2xl">{PVP_TIMEOUT_SECONDS - queueTime}s</p>
            <p className="text-xs text-muted-foreground">If they don't answer in {PVP_TIMEOUT_SECONDS}s, AI plays their bull with their name.</p>
            <Progress value={(queueTime / PVP_TIMEOUT_SECONDS) * 100} className="h-2" />
            <Button variant="outline" onClick={cancelQueue}>Cancel</Button>
          </Card>
        )}

        {/* Opponent picker */}
        {state === 'select' && !searching && pickingOpponent && (
          <div className="max-w-lg mx-auto space-y-3">
            <div className="text-center">
              <h2 className="text-lg font-bold">Pick an opponent</h2>
              <p className="text-xs text-muted-foreground">Fighting with {selected?.nft_name} (Lv {selected?.level})</p>
            </div>
            {loadingChallengers ? (
              <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" /></div>
            ) : challengers.length === 0 ? (
              <Card className="p-6 text-center bg-slate-900/50 border-slate-700 space-y-3">
                <p className="text-sm text-muted-foreground">No other bull holders found yet.</p>
                <Button onClick={() => { setPickingOpponent(false); setMode('ai'); selected && startAI(selected); }}>Train vs AI instead</Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {challengers.map((c) => (
                  <Card key={c.user_id} className="p-3 bg-slate-900/70 border-purple-800/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">🐂 {c.username}</div>
                      <div className="text-[11px] text-muted-foreground">Top Lv {c.top_level} · {c.bulls_owned} bull{c.bulls_owned === 1 ? '' : 's'}</div>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-fuchsia-500 to-red-500" onClick={() => challengeOpponent(c)}>
                      <Swords className="w-3 h-3 mr-1" /> Challenge
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setPickingOpponent(false)}>Back to bulls</Button>
          </div>
        )}


        {/* Bull selection */}
        {state === 'select' && !searching && !pickingOpponent && (
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
                        onClick={() => mode === 'ai' ? startAI(b) : openOpponentPicker(b)}>
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
                        <div className="mt-1">
                          <div className="flex justify-between text-[9px] text-cyan-200/90">
                            <span>EXP</span>
                            <span>{b.exp || 0}/{expNeeded(b.level)}</span>
                          </div>
                          <Progress value={Math.min(100, ((b.exp || 0) / expNeeded(b.level)) * 100)} className="h-1 mt-0.5" />
                        </div>
                        <div className="text-[11px] mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                          <span>❤️ {previewStats.maxHp}</span>
                          <span>⚔️ {previewStats.attack}</span>
                          <span>🛡️ {previewStats.defense}</span>
                          <span>⚡ {previewStats.special}</span>
                        </div>
                        <Button size="sm" className="w-full mt-2">
                          {mode === 'ai' ? <><Bot className="w-3 h-3 mr-1" /> AI Training</> : <><Users className="w-3 h-3 mr-1" /> Pick Opponent</>}
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
                {selected && (
                  <Button onClick={nextFight} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 h-12">
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
