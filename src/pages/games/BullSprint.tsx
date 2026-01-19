import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

interface SprintPlayer {
  id: string;
  user_id: string;
  username: string | null;
  position: number; // 0-100 percentage
  finished: boolean;
  finish_time: number | null;
}

const TRACK_LENGTH = 100;
const FINISH_LINE = 95;

export default function BullSprint() {
  const { goBack } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Player");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<SprintPlayer[]>([]);
  const [myPosition, setMyPosition] = useState(0);
  const [gameState, setGameState] = useState<"waiting" | "countdown" | "racing" | "finished">("waiting");
  const [countdown, setCountdown] = useState(3);
  const [raceTime, setRaceTime] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const raceStartTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const speedBoost = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first!");
        goBack();
        return;
      }

      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      setUsername((profile as any)?.username || "Player");
      fetchLeaderboard();
    };

    init();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('game_results')
      .select('*, profiles:user_id(username)')
      .eq('game_name', 'Bull Sprint')
      .eq('result', 'win')
      .order('multiplier', { ascending: true })
      .limit(10);
    
    if (data) setLeaderboard(data as any[]);
  };

  const joinOrCreateRoom = async () => {
    if (!userId) return;

    let { data: existingRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('game_type', 'sprint')
      .eq('status', 'waiting')
      .limit(1)
      .single();

    if (!existingRoom) {
      const { data: newRoom } = await supabase
        .from('game_rooms')
        .insert({ game_type: 'sprint', status: 'waiting', max_players: 4 })
        .select()
        .single();
      existingRoom = newRoom;
    }

    if (existingRoom) {
      setRoomId((existingRoom as any).id);
      
      await supabase
        .from('game_room_players')
        .delete()
        .eq('room_id', (existingRoom as any).id)
        .eq('user_id', userId);

      await supabase
        .from('game_room_players')
        .insert({
          room_id: (existingRoom as any).id,
          user_id: userId,
          username,
          bet_amount: 0,
          is_active: true
        });

      subscribeToRoom((existingRoom as any).id);
      toast.success("Joined sprint room! Waiting for players...");
    }
  };

  const subscribeToRoom = (rid: string) => {
    supabase
      .channel(`sprint-${rid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${rid}` }, (payload) => {
        if ((payload.new as any)?.status === 'playing') {
          startCountdown();
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
      setPlayers(data.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        username: p.username,
        position: 0,
        finished: false,
        finish_time: null
      })));
    }
  };

  const startGame = (singlePlayer = false) => {
    setIsSinglePlayer(singlePlayer);
    setMyPosition(0);
    setTapCount(0);
    speedBoost.current = 0;
    startCountdown();
  };

  const startCountdown = () => {
    setGameState('countdown');
    setCountdown(3);
    audioManager.playSFX('buttonPress');

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setGameState('racing');
          raceStartTime.current = Date.now();
          gameLoop();
          return 0;
        }
        audioManager.playSFX('coin');
        return c - 1;
      });
    }, 1000);
  };

  const gameLoop = () => {
    const loop = () => {
      // Update race time
      const elapsed = (Date.now() - raceStartTime.current) / 1000;
      setRaceTime(elapsed);

      // Slower decay so momentum lasts longer
      speedBoost.current *= 0.96;

      // Always apply movement - even small boost moves the bull forward
      setMyPosition(prev => {
        // Base movement + boost movement
        const boostMovement = speedBoost.current * 0.8;
        const newPos = Math.min(TRACK_LENGTH, prev + boostMovement);
        
        if (newPos >= FINISH_LINE && prev < FINISH_LINE) {
          finishRace(elapsed);
          return newPos;
        }
        
        return newPos;
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  const handleTap = () => {
    if (gameState !== 'racing') return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;
    lastTapTime.current = now;

    // Each tap gives significant boost - faster tapping = more boost
    const tapBonus = Math.max(1.5, 5 - timeSinceLastTap / 80);
    speedBoost.current = Math.min(15, speedBoost.current + tapBonus);
    
    setTapCount(prev => prev + 1);
    audioManager.playSFX('coin');

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const finishRace = async (time: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setGameState('finished');
    setFinalTime(time);
    audioManager.playSFX('jackpot');

    if (userId) {
      // Award diamonds based on time
      const diamonds = Math.max(5, Math.floor(30 - time));
      
      const { data: current } = await supabase
        .from('user_diamonds')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (current) {
        await supabase
          .from('user_diamonds')
          .update({
            balance: ((current as any).balance || 0) + diamonds,
            total_earned: ((current as any).total_earned || 0) + diamonds
          })
          .eq('user_id', userId);
      }

      await supabase.from('game_results').insert({
        user_id: userId,
        game_name: 'Bull Sprint',
        result: 'win',
        diamonds_won: diamonds,
        multiplier: time,
        credits_spent: 0
      });

      toast.success(`🏁 Finished in ${time.toFixed(2)}s! +${diamonds} 💎`);
      fetchLeaderboard();
    }
  };

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const W = 800;
      const H = 400;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
      bgGrad.addColorStop(0, '#1a0a2e');
      bgGrad.addColorStop(0.5, '#2d1b4e');
      bgGrad.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Track lanes
      const laneHeight = 80;
      const laneY = (H - laneHeight) / 2;
      
      ctx.fillStyle = '#2a3a5a';
      ctx.fillRect(50, laneY, W - 100, laneHeight);
      
      // Lane markings
      ctx.strokeStyle = '#4a5a7a';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(50, laneY + laneHeight / 2);
      ctx.lineTo(W - 50, laneY + laneHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance markers
      ctx.fillStyle = '#6a7a9a';
      ctx.font = '12px Arial';
      for (let i = 0; i <= 100; i += 25) {
        const x = 50 + (i / 100) * (W - 100);
        ctx.fillText(`${i}m`, x - 10, laneY - 10);
        ctx.strokeStyle = '#4a5a7a';
        ctx.beginPath();
        ctx.moveTo(x, laneY);
        ctx.lineTo(x, laneY + laneHeight);
        ctx.stroke();
      }

      // Finish line
      const finishX = 50 + (FINISH_LINE / 100) * (W - 100);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(finishX - 2, laneY - 20, 4, laneHeight + 40);
      ctx.font = 'bold 16px Arial';
      ctx.fillText('🏁 FINISH', finishX - 30, laneY - 25);

      // Player bull
      const playerX = 50 + (myPosition / 100) * (W - 100);
      const playerY = laneY + laneHeight / 2;

      // Speed trail effect
      if (speedBoost.current > 1) {
        const trailGrad = ctx.createLinearGradient(playerX - 100, 0, playerX, 0);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, `rgba(0, 212, 255, ${Math.min(0.5, speedBoost.current / 10)})`);
        ctx.fillStyle = trailGrad;
        ctx.fillRect(playerX - 100, playerY - 15, 100, 30);
      }

      // Bull body
      ctx.fillStyle = '#00D4FF';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY, 25, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bull head
      ctx.beginPath();
      ctx.arc(playerX + 15, playerY - 5, 12, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerX + 10, playerY - 12);
      ctx.quadraticCurveTo(playerX + 5, playerY - 25, playerX, playerY - 20);
      ctx.moveTo(playerX + 20, playerY - 12);
      ctx.quadraticCurveTo(playerX + 25, playerY - 25, playerX + 30, playerY - 20);
      ctx.stroke();

      // Speed indicator
      ctx.fillStyle = '#00D4FF';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`Speed: ${(speedBoost.current * 10).toFixed(0)} km/h`, 20, 30);
      ctx.fillText(`Taps: ${tapCount}`, 20, 50);

      // Race time
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${raceTime.toFixed(2)}s`, W - 20, 30);
      ctx.textAlign = 'left';

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), W / 2, H / 2 + 30);
        ctx.textAlign = 'left';
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [myPosition, speedBoost.current, countdown, gameState, raceTime, tapCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#00D4FF]" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold">Bull Sprint</span>
          </div>
        </div>

        {/* Title */}
        <Card className="mb-4 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/30">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            ⚡ Bull Sprint Race ⚡
          </h1>
          <p className="text-center text-purple-300 text-sm">Tap as fast as you can to reach the finish line!</p>
        </Card>

        {/* Game Canvas */}
        <Card className="mb-4 p-2 bg-black/50 border-purple-500/30 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full rounded-lg cursor-pointer"
            onClick={handleTap}
            onTouchStart={handleTap}
          />
        </Card>

        {/* Controls */}
        {gameState === 'waiting' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Button
              onClick={() => startGame(true)}
              className="h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
            >
              <Play className="w-6 h-6 mr-2" />
              Solo Sprint
            </Button>
            <Button
              onClick={joinOrCreateRoom}
              className="h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              <Users className="w-6 h-6 mr-2" />
              Multiplayer
            </Button>
          </div>
        )}

        {gameState === 'racing' && (
          <Card className="p-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30 text-center">
            <p className="text-2xl font-bold text-green-400 mb-2">TAP TAP TAP!</p>
            <p className="text-green-300">Click or tap the track as fast as possible!</p>
            <Button
              className="mt-4 h-20 w-full text-2xl bg-gradient-to-r from-yellow-500 to-orange-500"
              onClick={handleTap}
              onTouchStart={handleTap}
            >
              🐂 TAP TO RUN! 🐂
            </Button>
          </Card>
        )}

        {gameState === 'finished' && (
          <Card className="p-6 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-500/30 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">Race Complete!</h2>
            <p className="text-2xl text-white mb-4">Time: {finalTime?.toFixed(2)}s</p>
            <p className="text-lg text-green-400 mb-4">Taps: {tapCount}</p>
            <Button
              onClick={() => { setGameState('waiting'); setMyPosition(0); }}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Race Again
            </Button>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="mt-4 p-4 bg-black/30 border-purple-500/30">
          <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Fastest Times
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <span className="text-purple-300">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.profiles?.username || 'Anonymous'}
                </span>
                <span className="text-yellow-400 font-bold">{entry.multiplier?.toFixed(2)}s</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-purple-400/60 text-center">No times recorded yet!</p>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card className="mt-4 p-4 bg-black/30 border-purple-500/30">
          <h3 className="font-bold text-purple-400 mb-2">How to Play</h3>
          <ul className="text-purple-300 text-sm space-y-1">
            <li>⚡ Tap/click as fast as possible to build speed</li>
            <li>🐂 Your bull moves faster with rapid taps</li>
            <li>🏁 Reach the finish line in the shortest time</li>
            <li>💎 Faster times = more diamonds!</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
