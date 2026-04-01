import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

interface RoomPlayer {
  id: string;
  user_id: string;
  username: string | null;
  bet_amount: number;
  cashed_out_at: number | null;
  winnings: number;
  is_active: boolean;
}

interface GameRoom {
  id: string;
  status: string;
  round_data: { crash_point?: number; multiplier?: number };
}

const MultiplayerCrash = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Player");
  const [credits, setCredits] = useState(0);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashed, setCrashed] = useState(false);
  const [myBet, setMyBet] = useState(0);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [betInput, setBetInput] = useState(50);
  const [countdown, setCountdown] = useState(0);
  const gameInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashPoint = useRef(1);

  useEffect(() => {
    initUser();
    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
      leaveRoom();
    };
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [creditsRes, profileRes] = await Promise.all([
      supabase.from('user_credits').select('balance').eq('user_id', user.id).single(),
      supabase.from('profiles').select('username').eq('id', user.id).single()
    ]);

    setCredits((creditsRes.data as any)?.balance || 0);
    setUsername((profileRes.data as any)?.username || 'Player');
    
    joinOrCreateRoom(user.id, (profileRes.data as any)?.username);
  };

  const joinOrCreateRoom = async (uid: string, uname: string) => {
    // Find or create a waiting room
    let { data: existingRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('game_type', 'crash')
      .eq('status', 'waiting')
      .limit(1)
      .single();

    if (!existingRoom) {
      const { data: newRoom } = await supabase
        .from('game_rooms')
        .insert({ game_type: 'crash', status: 'waiting' })
        .select()
        .single();
      existingRoom = newRoom;
    }

    if (existingRoom) {
      setRoom(existingRoom as GameRoom);
      
      // Remove old entry if exists
      await supabase
        .from('game_room_players')
        .delete()
        .eq('room_id', existingRoom.id)
        .eq('user_id', uid);

      // Join room
      await supabase
        .from('game_room_players')
        .insert({
          room_id: existingRoom.id,
          user_id: uid,
          username: uname,
          is_active: true
        });

      subscribeToRoom(existingRoom.id);
    }
  };

  const subscribeToRoom = (roomId: string) => {
    const channel = supabase
      .channel(`crash-room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new) {
          const newRoom = payload.new as GameRoom;
          setRoom(newRoom);
          if (newRoom.status === 'playing') {
            startGameRound(newRoom);
          } else if (newRoom.status === 'finished') {
            handleRoundEnd(newRoom);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_room_players', filter: `room_id=eq.${roomId}` }, fetchPlayers)
      .subscribe();

    fetchPlayers();
    
    return () => supabase.removeChannel(channel);
  };

  const fetchPlayers = async () => {
    if (!room) return;
    const { data } = await supabase
      .from('game_room_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('is_active', true);
    if (data) setPlayers(data as RoomPlayer[]);
  };

  const leaveRoom = async () => {
    if (!userId || !room) return;
    await supabase
      .from('game_room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', userId);
  };

  const placeBet = async () => {
    if (!userId || !room || myBet > 0) return;
    if (credits < betInput) {
      toast.error("Not enough credits!");
      return;
    }

    // Deduct credits
    await supabase
      .from('user_credits')
      .update({ balance: credits - betInput })
      .eq('user_id', userId);
    setCredits(c => c - betInput);

    // Update bet
    await supabase
      .from('game_room_players')
      .update({ bet_amount: betInput })
      .eq('room_id', room.id)
      .eq('user_id', userId);
    
    setMyBet(betInput);
    toast.success(`Bet placed: ${betInput} credits`);

    // Check if we should start game
    const { data: bettingPlayers } = await supabase
      .from('game_room_players')
      .select('*')
      .eq('room_id', room.id)
      .gt('bet_amount', 0);

    if (bettingPlayers && bettingPlayers.length >= 1) {
      startCountdown();
    }
  };

  const startCountdown = () => {
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          initiateGame();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const initiateGame = async () => {
    if (!room) return;
    
    // Generate crash point
    const crash = 1 + Math.random() * 9;
    crashPoint.current = crash;

    await supabase
      .from('game_rooms')
      .update({ 
        status: 'playing', 
        started_at: new Date().toISOString(),
        round_data: { crash_point: crash, multiplier: 1 }
      })
      .eq('id', room.id);
  };

  const startGameRound = (gameRoom: GameRoom) => {
    setCrashed(false);
    setMultiplier(1.0);
    const crash = (gameRoom.round_data as any)?.crash_point || 2;
    crashPoint.current = crash;

    gameInterval.current = setInterval(() => {
      setMultiplier(m => {
        const newM = m + 0.02;
        if (newM >= crashPoint.current) {
          if (gameInterval.current) clearInterval(gameInterval.current);
          setCrashed(true);
          endRound();
          return crashPoint.current;
        }
        return newM;
      });
    }, 50);
  };

  const cashOut = async () => {
    if (!userId || !room || hasCashedOut || crashed) return;
    
    const winnings = Math.floor(myBet * multiplier);
    setHasCashedOut(true);

    await supabase
      .from('game_room_players')
      .update({ cashed_out_at: multiplier, winnings })
      .eq('room_id', room.id)
      .eq('user_id', userId);

    await supabase
      .from('user_credits')
      .update({ balance: credits + winnings })
      .eq('user_id', userId);
    
    setCredits(c => c + winnings);
    toast.success(`Cashed out at ${multiplier.toFixed(2)}x! Won ${winnings} credits!`);
  };

  const endRound = async () => {
    if (!room) return;
    await supabase
      .from('game_rooms')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', room.id);
  };

  const handleRoundEnd = async (gameRoom: GameRoom) => {
    setTimeout(async () => {
      // Reset for new round
      setMyBet(0);
      setHasCashedOut(false);
      setCrashed(false);
      setMultiplier(1.0);

      // Reset all players bets
      if (room) {
        await supabase
          .from('game_room_players')
          .update({ bet_amount: 0, cashed_out_at: null, winnings: 0 })
          .eq('room_id', room.id);
      }

      // Create new waiting room
      await supabase
        .from('game_rooms')
        .update({ status: 'waiting', round_data: {} })
        .eq('id', gameRoom.id);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            {getBackLabel()}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              <span className="font-bold">{players.length} Players</span>
            </div>
            <div className="text-xl font-bold">💎 {credits}</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <Card className="lg:col-span-2 p-6 bg-card/95">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
                Multiplayer Crash 🚀
              </h1>
            </div>

            {/* Multiplier Display */}
            <div className="bg-secondary/50 rounded-xl p-8 mb-6 text-center relative overflow-hidden">
              {countdown > 0 && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <div className="text-6xl font-bold text-primary animate-pulse">{countdown}</div>
                </div>
              )}
              
              <div className={`text-8xl font-bold mb-4 transition-all ${
                crashed ? 'text-destructive' : 'text-primary'
              }`}>
                {crashed ? '💥' : `${multiplier.toFixed(2)}x`}
              </div>
              
              {crashed && (
                <p className="text-2xl font-bold text-destructive">
                  CRASHED at {crashPoint.current.toFixed(2)}x!
                </p>
              )}

              {/* Visual Bar */}
              <div className="h-4 bg-muted rounded-full overflow-hidden mt-4">
                <div 
                  className={`h-full transition-all duration-100 ${crashed ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min((multiplier / 10) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Betting Controls */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <input
                  type="number"
                  value={betInput}
                  onChange={(e) => setBetInput(Math.max(10, parseInt(e.target.value) || 10))}
                  disabled={myBet > 0}
                  className="w-full p-3 bg-secondary rounded-lg text-xl font-bold text-center"
                />
              </div>
              
              {myBet === 0 ? (
                <Button
                  size="lg"
                  className="flex-1 text-xl"
                  onClick={placeBet}
                  disabled={room?.status === 'playing'}
                >
                  Place Bet
                </Button>
              ) : (
                <Button
                  size="lg"
                  className={`flex-1 text-xl ${hasCashedOut ? 'bg-muted' : 'bg-green-600 hover:bg-green-700'}`}
                  onClick={cashOut}
                  disabled={hasCashedOut || crashed || room?.status !== 'playing'}
                >
                  {hasCashedOut ? `Won ${Math.floor(myBet * (players.find(p => p.user_id === userId)?.cashed_out_at || multiplier))}` : `Cash Out (${Math.floor(myBet * multiplier)})`}
                </Button>
              )}
            </div>
          </Card>

          {/* Players Panel */}
          <Card className="p-6 bg-card/95">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" /> Live Players
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className={`p-3 rounded-lg ${
                    player.user_id === userId ? 'bg-primary/20 border border-primary' : 'bg-secondary/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {player.username || 'Player'}
                      {player.user_id === userId && ' (You)'}
                    </span>
                    {player.bet_amount > 0 && (
                      <span className="text-primary font-bold">{player.bet_amount}💎</span>
                    )}
                  </div>
                  
                  {player.cashed_out_at && (
                    <div className="text-sm text-green-500 mt-1">
                      ✓ Cashed out at {Number(player.cashed_out_at).toFixed(2)}x → {player.winnings}💎
                    </div>
                  )}
                  
                  {crashed && player.bet_amount > 0 && !player.cashed_out_at && (
                    <div className="text-sm text-destructive mt-1">
                      ✗ Lost {player.bet_amount}💎
                    </div>
                  )}
                </div>
              ))}
              
              {players.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Waiting for players...
                </p>
              )}
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-bold mb-1">How to Play:</p>
              <p className="text-muted-foreground">
                Place your bet and watch the multiplier rise. Cash out before it crashes! See other players' bets in real-time.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MultiplayerCrash;
