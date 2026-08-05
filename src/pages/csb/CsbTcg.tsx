import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Users, Bot, Crown, Coins, Swords, ShoppingBag, Layers, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import {
  SHOP_CARDS, TcgBoardState, TcgCard, TcgMinion, buildAiDeck, buildDeck, bullToCard,
  createBoardState, endTurn as engineEndTurn, aiTakeTurn, attack as engineAttack,
  makeSide, playCard as enginePlayCard, opponentOf, HERO_HP, MAX_BOARD,
} from "@/lib/csbTcg";

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string; exp?: number }
type Screen = 'select' | 'shop' | 'picking' | 'searching' | 'playing' | 'over';
type Mode = 'ai' | 'pvp';
type Challenger = { user_id: string; username: string; top_level: number; bulls_owned: number };

const CHALLENGE_SECONDS = 30;
const expNeeded = (lvl: number) => 100 + (lvl - 1) * 60;

export default function CsbTcg() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player, userId, addBalance, spendBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [captain, setCaptain] = useState<CsbBull | null>(null);
  const captainRef = useRef<CsbBull | null>(null);
  useEffect(() => { captainRef.current = captain; }, [captain]);
  const [owned, setOwned] = useState<Array<{ card_id: string; quantity: number }>>([]);
  const [username, setUsername] = useState('Duelist');

  const [screen, setScreen] = useState<Screen>('select');
  const screenRef = useRef<Screen>('select');
  useEffect(() => { screenRef.current = screen; }, [screen]);
  const [mode, setMode] = useState<Mode>('ai');
  const modeRef = useRef<Mode>('ai');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // match
  const [board, setBoard] = useState<TcgBoardState | null>(null);
  const boardRef = useRef<TcgBoardState | null>(null);
  useEffect(() => { boardRef.current = board; }, [board]);
  const [myId, setMyId] = useState<string>('me');
  const [foeId, setFoeId] = useState<string>('foe');
  const myIdRef = useRef('me'); const foeIdRef = useRef('foe');
  useEffect(() => { myIdRef.current = myId; foeIdRef.current = foeId; }, [myId, foeId]);
  const [turnId, setTurnId] = useState<string>('me');
  const turnIdRef = useRef('me');
  useEffect(() => { turnIdRef.current = turnId; }, [turnId]);
  const [aiProxy, setAiProxy] = useState(false);
  const aiProxyRef = useRef(false);
  useEffect(() => { aiProxyRef.current = aiProxy; }, [aiProxy]);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const resolvedRef = useRef(false);

  // targeting
  const [pendingCard, setPendingCard] = useState<TcgCard | null>(null);
  const [attacker, setAttacker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // pvp plumbing
  const [roomId, setRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  const userIdRef = useRef<string | null>(null);
  useEffect(() => { userIdRef.current = userId ?? null; }, [userId]);
  const [challengers, setChallengers] = useState<Challenger[]>([]);
  const [loadingChallengers, setLoadingChallengers] = useState(false);
  const [target, setTarget] = useState<Challenger | null>(null);
  const [queueTime, setQueueTime] = useState(0);
  const [incoming, setIncoming] = useState<{ roomId: string; fromName: string; fromLevel: number; hostDeck?: TcgCard[]; hostId?: string } | null>(null);
  const [incomingLeft, setIncomingLeft] = useState(CHALLENGE_SECONDS);

  const channelRef = useRef<any>(null);
  const queueTimerRef = useRef<any>(null);
  const acceptPollRef = useRef<any>(null);
  const statePollRef = useRef<any>(null);
  const matchedRef = useRef(false);
  const versionRef = useRef(-1);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [board?.log?.length]);

  // ---------- data ----------
  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data: existing } = await supabase.from('csbv1_nft_power' as any).select('*').eq('user_id', userId).order('nft_id');
      const existingIds = new Set(((existing || []) as any[]).map((r) => r.nft_id));
      const toInsert = (walletNfts || [])
        .filter((w) => w.assetNameHex && !existingIds.has(`csb_${w.assetNameHex}`))
        .map((w) => ({ user_id: userId, nft_id: `csb_${w.assetNameHex}`, nft_name: w.name || 'CSB Bull', rarity: 'common', level: 1 }));
      if (toInsert.length) await supabase.from('csbv1_nft_power' as any).insert(toInsert);
      const { data } = toInsert.length
        ? await supabase.from('csbv1_nft_power' as any).select('*').eq('user_id', userId).order('nft_id')
        : { data: existing };
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith('csb_') && (walletNfts.length === 0 || walletNfts.some((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`)));
      const merged = rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const num = (r.nft_name || '').match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` } as CsbBull;
      }).sort((a, b) => b.level - a.level);
      setBulls(merged);
      setCaptain((prev) => prev || merged[0] || null);

      const { data: cards } = await supabase.from('csb_tcg_cards' as any).select('card_id, quantity').eq('user_id', userId);
      setOwned(((cards || []) as any[]).map((c) => ({ card_id: c.card_id, quantity: c.quantity })));

      const { data: prof } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
      if (prof?.username) setUsername(prof.username);
    };
    load();
  }, [userId, walletNfts.length]);

  // Arrived from the Battle Arena with an opponent already in mind
  const autoOppRef = useRef(false);
  useEffect(() => {
    const opp = params.get('opp');
    if (!opp || autoOppRef.current || bulls.length === 0) return;
    autoOppRef.current = true;
    setMode('pvp'); setScreen('picking'); loadChallengers();
  }, [params, bulls.length]);


  // cleanup on leave only
  useEffect(() => () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    [queueTimerRef, acceptPollRef, statePollRef].forEach((r) => r.current && clearInterval(r.current));
    const rid = roomIdRef.current, uid = userIdRef.current;
    if (rid && uid) supabase.from('game_room_players').delete().eq('room_id', rid).eq('user_id', uid);
  }, []);

  // ---------- shop ----------
  const buyCard = async (id: string) => {
    const card = SHOP_CARDS.find((c) => c.id === id);
    if (!card || !userId) return;
    const ok = await spendBalance(card.price);
    if (!ok) { toast({ title: 'Not enough Rune Power', description: `${card.name} costs ${card.price} 🪙` }); return; }
    const current = owned.find((o) => o.card_id === id);
    if (current) {
      await supabase.from('csb_tcg_cards' as any).update({ quantity: current.quantity + 1 }).eq('user_id', userId).eq('card_id', id);
      setOwned((p) => p.map((o) => (o.card_id === id ? { ...o, quantity: o.quantity + 1 } : o)));
    } else {
      await supabase.from('csb_tcg_cards' as any).insert({ user_id: userId, card_id: id, quantity: 1 });
      setOwned((p) => [...p, { card_id: id, quantity: 1 }]);
    }
    toast({ title: `Added ${card.name} to your collection`, description: 'Max 3 copies enter your deck.' });
  };

  // ---------- match setup ----------
  const startLocalMatch = (foeName: string, foeDeck: TcgCard[], proxy: boolean) => {
    const me = 'me', foe = 'foe';
    const state = createBoardState(
      me, foe,
      makeSide(username, buildDeck(bulls, owned)),
      makeSide(foeName, foeDeck),
    );
    setMyId(me); setFoeId(foe); setTurnId(state.hostId);
    setBoard(state); setAiProxy(proxy); setResult(null); resolvedRef.current = false;
    setPendingCard(null); setAttacker(null); setScreen('playing');
  };

  const startAi = () => {
    if (!captain) { toast({ title: 'Pick a captain bull first' }); return; }
    setMode('ai');
    startLocalMatch('Shadow Deck AI', buildAiDeck(captain.level), false);
  };

  // ---------- challenges ----------
  const loadChallengers = async () => {
    setLoadingChallengers(true);
    const { data } = await supabase.from('csb_challengers' as any).select('*');
    setChallengers(((data || []) as any[])
      .filter((c) => c.user_id && c.user_id !== userId)
      .map((c) => ({ user_id: c.user_id, username: c.username || 'Bull Holder', top_level: Number(c.top_level) || 1, bulls_owned: Number(c.bulls_owned) || 0 }))
      .sort((a, b) => b.top_level - a.top_level));
    setLoadingChallengers(false);
  };

  const openPicker = () => {
    if (!captain) { toast({ title: 'Pick a captain bull first' }); return; }
    setMode('pvp'); setScreen('picking'); loadChallengers();
  };

  const challengeOpponent = async (opp: Challenger) => {
    if (!userId || !captain) return;
    matchedRef.current = false; resolvedRef.current = false; versionRef.current = -1;
    setTarget(opp); setMode('pvp'); setScreen('searching'); setQueueTime(0);

    const myDeck = buildDeck(bulls, owned);
    const { data: nr } = await supabase.from('game_rooms').insert({
      game_type: 'csb-tcg', status: 'waiting', max_players: 2, created_by: userId,
      round_data: {
        challenger_id: userId, challenger_name: username, challenger_level: captain.level,
        target_id: opp.user_id, target_name: opp.username, host_deck: myDeck as any,
      } as any,
    }).select('id').single();
    if (!nr) { setScreen('picking'); toast({ title: 'Could not send challenge' }); return; }

    roomIdRef.current = nr.id; setRoomId(nr.id);
    await supabase.from('game_room_players').insert({ room_id: nr.id, user_id: userId, username, is_active: true });
    subscribeRoom(nr.id);
    toast({ title: `TCG challenge sent to ${opp.username}`, description: 'They have 30 seconds to answer.' });

    if (acceptPollRef.current) clearInterval(acceptPollRef.current);
    acceptPollRef.current = setInterval(async () => {
      if (matchedRef.current) { clearInterval(acceptPollRef.current); return; }
      const { data } = await supabase.from('csb_tcg_states' as any).select('*').eq('room_id', nr.id).maybeSingle();
      if (data) { matchedRef.current = true; clearInterval(acceptPollRef.current); applyShared(data); }
    }, 1000);

    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = setInterval(() => {
      setQueueTime((t) => {
        const nt = t + 1;
        if (matchedRef.current) { clearInterval(queueTimerRef.current); return t; }
        if (nt >= CHALLENGE_SECONDS) {
          clearInterval(queueTimerRef.current);
          (async () => {
            if (matchedRef.current) return;
            matchedRef.current = true;
            if (acceptPollRef.current) clearInterval(acceptPollRef.current);
            if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
            await supabase.from('game_room_players').delete().eq('room_id', nr.id).eq('user_id', userId);
            await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', nr.id);
            roomIdRef.current = null; setRoomId(null);
            toast({ title: `${opp.username} didn't answer`, description: 'AI takes their deck.' });
            startLocalMatch(`${opp.username} (AI)`, buildAiDeck(opp.top_level), true);
          })();
        }
        return nt;
      });
    }, 1000);
  };

  // incoming challenge inbox
  useEffect(() => {
    if (!userId) return;
    const offer = (r: any, left = CHALLENGE_SECONDS) => {
      const rd = r?.round_data || {};
      if (rd.target_id !== userId) return;
      if (screenRef.current === 'playing') return;
      setIncoming((prev) => {
        if (prev?.roomId === r.id) return prev;
        setIncomingLeft(Math.max(1, left));
        toast({ title: `🃏 ${rd.challenger_name || 'A player'} challenged you to a TCG duel!` });
        return { roomId: r.id, fromName: rd.challenger_name || 'A challenger', fromLevel: Number(rd.challenger_level) || 1, hostDeck: rd.host_deck, hostId: rd.challenger_id };
      });
    };

    const ch = supabase.channel('csb-tcg-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_rooms', filter: 'game_type=eq.csb-tcg' }, (p) => offer(p.new))
      .subscribe();

    const poll = setInterval(async () => {
      if (screenRef.current === 'playing') return;
      const since = new Date(Date.now() - CHALLENGE_SECONDS * 1000).toISOString();
      const { data } = await supabase.from('game_rooms')
        .select('id, round_data, created_at')
        .eq('game_type', 'csb-tcg').eq('status', 'waiting')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(5);
      (data || []).forEach((r: any) => {
        const left = CHALLENGE_SECONDS - Math.floor((Date.now() - new Date(r.created_at).getTime()) / 1000);
        if (left <= 2) return;
        offer(r, left);
      });
    }, 1000);

    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [userId]);

  useEffect(() => {
    if (!incoming) return;
    const t = setInterval(() => {
      setIncomingLeft((s) => { if (s <= 1) { clearInterval(t); setIncoming(null); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [incoming?.roomId]);

  const acceptChallenge = async () => {
    if (!incoming || !userId || !incoming.hostId) return;
    if (!captain && bulls[0]) setCaptain(bulls[0]);
    const rId = incoming.roomId;
    const hostId = incoming.hostId;
    setIncoming(null);
    matchedRef.current = true; resolvedRef.current = false; versionRef.current = -1;
    roomIdRef.current = rId; setRoomId(rId); setMode('pvp'); setAiProxy(false);

    await supabase.from('game_room_players').insert({ room_id: rId, user_id: userId, username, is_active: true });
    await supabase.from('game_rooms').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', rId);

    const hostDeck = (incoming.hostDeck && incoming.hostDeck.length ? incoming.hostDeck : buildAiDeck(incoming.fromLevel));
    const state = createBoardState(
      hostId, userId,
      makeSide(incoming.fromName, hostDeck),
      makeSide(username, buildDeck(bulls, owned)),
    );
    const { data, error } = await supabase.from('csb_tcg_states' as any).insert({
      room_id: rId, host_user_id: hostId, guest_user_id: userId,
      turn_user_id: hostId, status: 'active', board: state as any,
      last_action: { type: 'start' } as any,
    }).select('*').single();
    if (error || !data) { toast({ title: 'Could not start the duel', description: 'Try again.' }); return; }
    subscribeRoom(rId);
    applyShared(data);
  };

  // ---------- shared state ----------
  const applyShared = (row: any) => {
    if (!userId) return;
    if (roomIdRef.current && row.room_id !== roomIdRef.current) return;
    const state = row.board as TcgBoardState;
    if (!state?.sides) return;
    if (row.version < versionRef.current) return;
    versionRef.current = row.version;
    [queueTimerRef, acceptPollRef].forEach((r) => r.current && clearInterval(r.current));
    matchedRef.current = true;
    setMyId(userId); setFoeId(row.host_user_id === userId ? row.guest_user_id : row.host_user_id);
    setBoard(state); setTurnId(row.turn_user_id); setMode('pvp'); setAiProxy(false);
    setScreen((s) => (s === 'over' ? s : 'playing'));
    if (state.winnerId && !resolvedRef.current) {
      resolvedRef.current = true;
      finishMatch(state.winnerId === userId, row.room_id);
    }
  };

  const fetchShared = async (rId: string) => {
    const { data } = await supabase.from('csb_tcg_states' as any).select('*').eq('room_id', rId).maybeSingle();
    if (data) applyShared(data);
  };

  const subscribeRoom = (rId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`csb-tcg-${rId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csb_tcg_states', filter: `room_id=eq.${rId}` }, (p) => { if (p.new) applyShared(p.new); })
      .subscribe();
    if (statePollRef.current) clearInterval(statePollRef.current);
    statePollRef.current = setInterval(() => fetchShared(rId), 800);
    fetchShared(rId);
  };

  const pushState = async (next: TcgBoardState, nextTurnId: string) => {
    const rid = roomIdRef.current;
    if (!rid) return;
    const status = next.winnerId ? 'finished' : 'active';
    const { data, error } = await supabase.from('csb_tcg_states' as any)
      .update({ board: next as any, turn_user_id: nextTurnId, status })
      .eq('room_id', rid).select('*').maybeSingle();
    if (error) { toast({ title: 'Move not accepted', description: 'Syncing with your opponent…' }); await fetchShared(rid); return; }
    if (data) applyShared(data);
  };

  const isPvp = () => modeRef.current === 'pvp' && !!roomIdRef.current && !aiProxyRef.current;

  const commit = async (next: TcgBoardState, handOver: boolean) => {
    setBoard(next);
    if (next.winnerId && !resolvedRef.current) {
      resolvedRef.current = true;
      if (isPvp()) await pushState(next, myIdRef.current);
      finishMatch(next.winnerId === myIdRef.current, roomIdRef.current || undefined);
      return;
    }
    if (isPvp()) {
      await pushState(next, handOver ? foeIdRef.current : myIdRef.current);
    } else if (handOver) {
      setTurnId(foeIdRef.current);
      setTimeout(() => runAiTurn(next), 800);
    }
  };

  const runAiTurn = (state: TcgBoardState) => {
    const after = aiTakeTurn(state, foeIdRef.current);
    setBoard(after);
    setTurnId(after.winnerId ? foeIdRef.current : myIdRef.current);
    if (after.winnerId && !resolvedRef.current) {
      resolvedRef.current = true;
      finishMatch(after.winnerId === myIdRef.current);
    }
  };

  // ---------- player actions ----------
  const myTurn = board ? turnId === myId && !board.winnerId : false;
  const mySide = board?.sides?.[myId];
  const foeSide = board?.sides?.[foeId];

  const needsTarget = (c: TcgCard) => c.type === 'spell' && ['damage_any', 'buff_hp', 'buff_atk_rush'].includes(c.effect || '');

  const clickHandCard = async (c: TcgCard) => {
    if (!board || !myTurn || busy) return;
    if ((mySide?.mana || 0) < c.cost) { toast({ title: 'Not enough mana' }); return; }
    if (c.type === 'minion' && (mySide?.board.length || 0) >= MAX_BOARD) { toast({ title: 'Your board is full' }); return; }
    setAttacker(null);
    if (needsTarget(c)) { setPendingCard(pendingCard?.uid === c.uid ? null : c); return; }
    setBusy(true);
    const res = enginePlayCard(board, myId, c.uid);
    if (!res.ok) toast({ title: res.error || 'Cannot play that card' });
    else await commit(res.state, false);
    setBusy(false);
  };

  const clickMinion = async (m: TcgMinion, friendly: boolean) => {
    if (!board || !myTurn || busy) return;
    if (pendingCard) {
      setBusy(true);
      const res = enginePlayCard(board, myId, pendingCard.uid, { targetMinionUid: m.uid });
      if (!res.ok) toast({ title: res.error || 'Invalid target' });
      else { setPendingCard(null); await commit(res.state, false); }
      setBusy(false);
      return;
    }
    if (friendly) {
      if (!m.canAttack) { toast({ title: `${m.name} can't attack yet` }); return; }
      setAttacker(attacker === m.uid ? null : m.uid);
      return;
    }
    if (!attacker) { toast({ title: 'Pick one of your minions first' }); return; }
    setBusy(true);
    const res = engineAttack(board, myId, attacker, { minionUid: m.uid });
    if (!res.ok) toast({ title: res.error || 'Cannot attack' });
    else { setAttacker(null); await commit(res.state, false); }
    setBusy(false);
  };

  const clickHero = async (friendly: boolean) => {
    if (!board || !myTurn || busy) return;
    if (pendingCard) {
      if (friendly || pendingCard.effect !== 'damage_any') { toast({ title: 'Pick a valid target' }); return; }
      setBusy(true);
      const res = enginePlayCard(board, myId, pendingCard.uid, { targetHero: 'foe' });
      if (!res.ok) toast({ title: res.error || 'Invalid target' });
      else { setPendingCard(null); await commit(res.state, false); }
      setBusy(false);
      return;
    }
    if (friendly || !attacker) return;
    setBusy(true);
    const res = engineAttack(board, myId, attacker, { hero: true });
    if (!res.ok) toast({ title: res.error || 'Cannot attack' });
    else { setAttacker(null); await commit(res.state, false); }
    setBusy(false);
  };

  const endTurnNow = async () => {
    if (!board || !myTurn || busy) return;
    setBusy(true);
    setPendingCard(null); setAttacker(null);
    const next = engineEndTurn(board, myId);
    await commit(next, true);
    setBusy(false);
  };

  // ---------- rewards ----------
  const grantExp = async (amount: number, reason: string) => {
    const cap = captainRef.current;
    if (!cap || !userId || amount <= 0) return;
    let lvl = cap.level; let exp = (cap.exp || 0) + amount; let leveled = 0;
    while (exp >= expNeeded(lvl)) { exp -= expNeeded(lvl); lvl += 1; leveled += 1; }
    const updated = { ...cap, level: lvl, exp };
    setCaptain(updated);
    setBulls((prev) => prev.map((b) => (b.nft_id === cap.nft_id ? updated : b)));
    await supabase.from('csbv1_nft_power' as any)
      .update({ level: lvl, exp, updated_at: new Date().toISOString() })
      .eq('user_id', userId).eq('nft_id', cap.nft_id);
    if (leveled > 0) toast({ title: `🎉 Level Up! Lv ${lvl}`, description: `${cap.nft_name} grew stronger (${reason})` });
  };

  const finishMatch = async (won: boolean, rId?: string) => {
    setResult(won ? 'win' : 'loss');
    setScreen('over');
    const pvp = modeRef.current === 'pvp' && !aiProxyRef.current;
    const lvl = captainRef.current?.level || 1;
    if (won) {
      const reward = Math.floor((25 + lvl * 10) * 2 * (pvp ? 3 : 1));
      await addBalance(reward);
      toast({ title: 'Duel won! 🏆', description: `+${reward} Rune Power` });
      await grantExp(Math.floor((40 + lvl * 12) * (pvp ? 2 : 1)), pvp ? 'TCG PvP win' : 'TCG win');
    } else {
      await grantExp(pvp ? 20 : 12, 'duel experience');
    }
    if (userId) {
      await supabase.from('game_results').insert({
        user_id: userId, game_name: 'Cardano Stake Bulls TCG', result: won ? 'win' : 'loss', diamonds_won: 0,
      });
    }
    const room = rId || roomIdRef.current;
    if (room) await supabase.from('game_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room);
  };

  const leaveMatch = async () => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    [queueTimerRef, acceptPollRef, statePollRef].forEach((r) => { if (r.current) { clearInterval(r.current); r.current = null; } });
    const rid = roomIdRef.current;
    if (rid && userId) await supabase.from('game_room_players').delete().eq('room_id', rid).eq('user_id', userId);
    roomIdRef.current = null; setRoomId(null); setBoard(null); setResult(null); setTarget(null);
    resolvedRef.current = false; versionRef.current = -1; matchedRef.current = false;
    setPendingCard(null); setAttacker(null); setAiProxy(false); setScreen('select');
  };

  const cancelQueue = async () => {
    matchedRef.current = true;
    await leaveMatch();
  };

  // ---------- UI pieces ----------
  const CardFace = ({ c, playable, selected, onClick }: { c: TcgCard; playable: boolean; selected: boolean; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={`shrink-0 w-24 rounded-lg p-1.5 text-left border-2 transition-transform ${
        selected ? 'border-cyan-300 -translate-y-2' : playable ? 'border-amber-400/70 hover:-translate-y-1' : 'border-white/10 opacity-60'
      } bg-gradient-to-br ${c.bull ? 'from-amber-700 to-rose-900' : c.type === 'spell' ? 'from-indigo-800 to-purple-900' : 'from-slate-700 to-slate-900'}`}
    >
      <div className="flex items-center justify-between">
        <span className="w-5 h-5 rounded-full bg-sky-500 text-[10px] font-black flex items-center justify-center">{c.cost}</span>
        {c.type === 'minion' ? <span className="text-[10px] font-bold">{c.atk}/{c.hp}</span> : <span className="text-[10px]">✨</span>}
      </div>
      <div className="h-10 my-1 rounded bg-black/30 overflow-hidden flex items-center justify-center">
        {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-lg">{c.type === 'spell' ? '📜' : '🐂'}</span>}
      </div>
      <div className="text-[10px] font-bold leading-tight truncate">{c.name}</div>
      <div className="text-[8px] opacity-80 leading-tight line-clamp-2 h-[18px]">{c.text}</div>
    </button>
  );

  const MinionFace = ({ m, friendly }: { m: TcgMinion; friendly: boolean }) => (
    <button
      onClick={() => clickMinion(m, friendly)}
      className={`shrink-0 w-[70px] rounded-lg p-1 border-2 bg-gradient-to-br ${m.bull ? 'from-amber-700 to-rose-900' : 'from-slate-700 to-slate-900'} ${
        attacker === m.uid ? 'border-cyan-300 ring-2 ring-cyan-400/60' : friendly && m.canAttack && myTurn ? 'border-green-400/80' : 'border-white/10'
      }`}
    >
      <div className="h-9 rounded bg-black/30 overflow-hidden flex items-center justify-center">
        {m.image ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" /> : <span>🐂</span>}
      </div>
      <div className="text-[9px] font-bold truncate">{m.name}</div>
      <div className="flex justify-between text-[10px] font-black"><span className="text-amber-300">{m.atk}</span><span className="text-red-300">{m.hp}</span></div>
    </button>
  );

  const HeroBar = ({ side, friendly }: { side: any; friendly: boolean }) => (
    <button
      onClick={() => clickHero(friendly)}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 border ${friendly ? 'border-cyan-700/60 bg-cyan-950/40' : 'border-rose-700/60 bg-rose-950/40'} ${
        !friendly && (attacker || pendingCard?.effect === 'damage_any') && myTurn ? 'ring-2 ring-red-400/70' : ''
      }`}
    >
      <span className="text-xl">{friendly ? '🧑‍🚀' : '👤'}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-bold truncate">{side?.name}</div>
        <Progress value={Math.max(0, (side?.hp / HERO_HP) * 100)} className="h-1.5 mt-1" />
      </div>
      <span className="text-sm font-black text-red-300">❤️ {Math.max(0, side?.hp ?? 0)}</span>
      <span className="text-[11px] font-bold text-sky-300">💧 {side?.mana}/{side?.maxMana}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => (screen === 'playing' || screen === 'over' ? leaveMatch() : navigate('/csb'))} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {screen === 'playing' || screen === 'over' ? 'Leave duel' : 'Back'}
          </Button>
          <Badge className="bg-gradient-to-r from-sky-500 to-indigo-500">🪙 {player?.balance ?? 0} Rune Power</Badge>
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
            Cardano Stake Bulls TCG
          </h1>
          <p className="text-xs text-muted-foreground">Mana curve card duels — your wallet bulls are your creatures.</p>
        </div>

        {/* Incoming duel challenge */}
        <Dialog open={!!incoming} onOpenChange={(o) => { if (!o) setIncoming(null); }}>
          <DialogContent className="max-w-sm bg-slate-900 border-sky-500">
            <DialogHeader>
              <DialogTitle className="text-sky-300 text-center">🃏 {incoming?.fromName} wants a TCG duel!</DialogTitle>
              <DialogDescription className="text-center">Top bull Lv {incoming?.fromLevel} · {incomingLeft}s to answer</DialogDescription>
            </DialogHeader>
            <Progress value={(incomingLeft / CHALLENGE_SECONDS) * 100} className="h-2" />
            <div className="flex gap-2">
              <Button className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500" onClick={acceptChallenge}>Accept Duel</Button>
              <Button variant="outline" className="flex-1" onClick={() => setIncoming(null)}>Decline</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Waiting */}
        {screen === 'searching' && (
          <Card className="bg-slate-900/80 border-sky-700 p-6 text-center max-w-md mx-auto space-y-3">
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin mx-auto" />
            <h3 className="text-lg font-bold">Waiting for {target?.username || 'opponent'}…</h3>
            <p className="font-mono text-sky-300 text-2xl">{CHALLENGE_SECONDS - queueTime}s</p>
            <p className="text-xs text-muted-foreground">If they don't answer, AI plays their deck under their name.</p>
            <Progress value={(queueTime / CHALLENGE_SECONDS) * 100} className="h-2" />
            <Button variant="outline" onClick={cancelQueue}>Cancel</Button>
          </Card>
        )}

        {/* Opponent picker */}
        {screen === 'picking' && (
          <div className="max-w-lg mx-auto space-y-3">
            <div className="text-center">
              <h2 className="text-lg font-bold">Pick a duel opponent</h2>
              <p className="text-xs text-muted-foreground">Captain: {captain?.nft_name} (Lv {captain?.level})</p>
            </div>
            {loadingChallengers ? (
              <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-400" /></div>
            ) : challengers.length === 0 ? (
              <Card className="p-6 text-center bg-slate-900/50 border-slate-700 space-y-3">
                <p className="text-sm text-muted-foreground">No other bull holders found yet.</p>
                <Button onClick={startAi}>Duel the AI instead</Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {challengers.map((c) => (
                  <Card key={c.user_id} className="p-3 bg-slate-900/70 border-sky-800/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">🐂 {c.username}</div>
                      <div className="text-[11px] text-muted-foreground">Top Lv {c.top_level} · {c.bulls_owned} bull{c.bulls_owned === 1 ? '' : 's'}</div>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-sky-500 to-indigo-500" onClick={() => challengeOpponent(c)}>
                      <Swords className="w-3 h-3 mr-1" /> Duel
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setScreen('select')}>Back</Button>
          </div>
        )}

        {/* Card shop */}
        {screen === 'shop' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Card Shop</h2>
              <Button variant="ghost" onClick={() => setScreen('select')}>Back to deck</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SHOP_CARDS.map((c) => {
                const have = owned.find((o) => o.card_id === c.id)?.quantity || 0;
                return (
                  <Card key={c.id} className="p-3 bg-slate-900/70 border-indigo-800/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{c.emoji}</span>
                      <Badge variant="outline" className="text-[10px]">💧 {c.cost}</Badge>
                    </div>
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground min-h-[30px]">{c.text}</div>
                    {c.type === 'minion' && <div className="text-[11px] font-bold">⚔️ {c.atk} · ❤️ {c.hp}</div>}
                    <div className="text-[11px] text-cyan-300">Owned: {have}/3</div>
                    <Button size="sm" className="w-full bg-gradient-to-r from-sky-500 to-indigo-500" onClick={() => buyCard(c.id)}>
                      <Coins className="w-3 h-3 mr-1" /> {c.price}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Deck / captain selection */}
        {screen === 'select' && (
          <div className="space-y-4">
            {bulls.length === 0 ? (
              <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">No CSB Bulls detected. Hold a bull and visit NFT Power to register them.</p>
                <Button onClick={() => navigate('/csb/nft-power')}>Go to NFT Power</Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                  <Button className="bg-gradient-to-r from-sky-500 to-cyan-500" onClick={startAi}><Bot className="w-4 h-4 mr-1" /> AI Duel</Button>
                  <Button className="bg-gradient-to-r from-fuchsia-500 to-indigo-500" onClick={openPicker}><Users className="w-4 h-4 mr-1" /> Pick Opponent (PvP)</Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Layers className="w-3 h-3" /> Deck: {bulls.length} bulls + {owned.reduce((s, o) => s + Math.min(3, o.quantity), 0)} shop cards
                  <Button size="sm" variant="outline" className="ml-2 h-7" onClick={() => setScreen('shop')}>Card Shop</Button>
                </div>
                <h2 className="text-lg font-bold text-center">Choose your Captain bull (earns the EXP)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {bulls.map((b) => {
                    const preview = bullToCard(b);
                    const active = captain?.nft_id === b.nft_id;
                    return (
                      <Card key={b.nft_id} onClick={() => setCaptain(b)}
                        className={`p-3 cursor-pointer bg-gradient-to-br from-amber-700/70 to-rose-900/70 border-2 ${active ? 'border-cyan-300 ring-2 ring-cyan-400/50' : 'border-white/10'}`}>
                        <div className="aspect-square rounded-lg bg-black/40 overflow-hidden flex items-center justify-center mb-2">
                          {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                        <div className="font-bold text-sm">{b.nft_name}</div>
                        <div className="text-xs opacity-90">Lv {b.level} · 💧{preview.cost} · {preview.atk}/{preview.hp}</div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Battlefield */}
        {(screen === 'playing' || screen === 'over') && board && (
          <div className="space-y-2">
            <HeroBar side={foeSide} friendly={false} />
            <div className="min-h-[70px] rounded-lg bg-rose-950/20 border border-rose-900/40 p-2 flex gap-2 overflow-x-auto">
              {foeSide?.board.length ? foeSide.board.map((m) => <MinionFace key={m.uid} m={m} friendly={false} />)
                : <span className="text-xs text-muted-foreground m-auto">No enemy minions</span>}
            </div>

            <div className="text-center text-xs font-bold">
              {board.winnerId ? (result === 'win' ? '🏆 You won the duel!' : '💀 You lost the duel.')
                : myTurn ? <span className="text-green-400">Your turn</span>
                : <span className="text-amber-300 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Opponent is playing…</span>}
            </div>

            <div className="min-h-[70px] rounded-lg bg-cyan-950/20 border border-cyan-900/40 p-2 flex gap-2 overflow-x-auto">
              {mySide?.board.length ? mySide.board.map((m) => <MinionFace key={m.uid} m={m} friendly={true} />)
                : <span className="text-xs text-muted-foreground m-auto">Play a minion from your hand</span>}
            </div>
            <HeroBar side={mySide} friendly={true} />

            {screen === 'playing' && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mySide?.hand.map((c) => (
                    <CardFace key={c.uid} c={c} playable={myTurn && c.cost <= (mySide?.mana || 0)} selected={pendingCard?.uid === c.uid} onClick={() => clickHandCard(c)} />
                  ))}
                </div>
                {pendingCard && <div className="text-center text-[11px] text-cyan-300">Pick a target for {pendingCard.name} (tap a minion{pendingCard.effect === 'damage_any' ? ' or the enemy hero' : ''})</div>}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500" disabled={!myTurn || busy} onClick={endTurnNow}>End Turn</Button>
                  <Button variant="outline" onClick={leaveMatch}>Forfeit</Button>
                </div>
              </>
            )}

            {screen === 'over' && (
              <div className="flex gap-2">
                <Button className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500" onClick={leaveMatch}>Back to deck</Button>
                {mode === 'ai' && <Button variant="outline" className="flex-1" onClick={() => { resolvedRef.current = false; startAi(); }}>Duel again</Button>}
              </div>
            )}

            <div ref={logRef} className="h-28 overflow-y-auto rounded-lg bg-black/40 border border-white/10 p-2 space-y-0.5 text-[11px]">
              {board.log.slice(-40).map((l, i) => <div key={i} className="text-cyan-200/90">{l}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
