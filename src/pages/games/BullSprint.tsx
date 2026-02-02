import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  time: number;
  diamonds_won: number;
}

const TRACK_LENGTH = 100;
const FINISH_LINE = 95;

export default function BullSprint() {
  const { goBack } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Player");
  const [gameState, setGameState] = useState<"waiting" | "countdown" | "racing" | "finished">("waiting");
  const [countdown, setCountdown] = useState(3);
  const [raceTime, setRaceTime] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [diamondsWon, setDiamondsWon] = useState(0);
  const [position, setPosition] = useState(0);

  // Use refs for game loop state to avoid stale closures
  const positionRef = useRef(0);
  const gameStateRef = useRef<"waiting" | "countdown" | "racing" | "finished">("waiting");
  const raceStartTimeRef = useRef<number>(0);
  const hasFinishedRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  const gameLoopRef = useRef<number>(0);

  // Initialize user
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
      
      // Play sound on enter
      audioManager.playSFX('buttonPress');
    };

    init();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [goBack]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('game_results')
      .select('id, user_id, diamonds_won, multiplier, created_at')
      .eq('game_name', 'Bull Sprint')
      .eq('result', 'win')
      .order('multiplier', { ascending: true })
      .limit(10);
    
    if (data && data.length > 0) {
      const resultsWithUsernames = await Promise.all(
        data.map(async (result: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', result.user_id)
            .single();
          return {
            id: result.id,
            user_id: result.user_id,
            username: profile?.username || 'Anonymous',
            time: result.multiplier || 0,
            diamonds_won: result.diamonds_won || 0
          };
        })
      );
      setLeaderboard(resultsWithUsernames);
    }
  };

  const finishRace = useCallback(async (time: number) => {
    // Prevent multiple finish calls
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Stop game loop
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = 0;

    // Update state
    gameStateRef.current = 'finished';
    setGameState('finished');
    setFinalTime(time);
    
    // Play victory sound
    audioManager.playSFX('jackpot');

    if (userId) {
      // Award diamonds based on time (faster = more diamonds)
      const diamonds = Math.max(5, Math.floor(30 - time));
      setDiamondsWon(diamonds);
      
      // Update user diamonds
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

      // Store diamonds in sessionStorage for Bull World
      const currentCollected = parseInt(sessionStorage.getItem('mazeDiamondsCollected') || '0');
      sessionStorage.setItem('mazeDiamondsCollected', String(currentCollected + diamonds));

      // Save to leaderboard with username
      await supabase.from('game_results').insert({
        user_id: userId,
        game_name: 'Bull Sprint',
        result: 'win',
        diamonds_won: diamonds,
        multiplier: time,
        credits_spent: 0
      });

      toast.success(`🏆 Victory! +${diamonds} 💎 added to wallet!`);
      fetchLeaderboard();
    }
  }, [userId]);

  const handleTap = useCallback(() => {
    if (gameStateRef.current !== 'racing') return;

    // Move bull forward on each tap
    const tapDistance = 1.8;
    positionRef.current = Math.min(TRACK_LENGTH, positionRef.current + tapDistance);
    setPosition(positionRef.current);
    setTapCount(prev => prev + 1);
    
    // Play tap sound
    audioManager.playSFX('coin');

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Check for finish - IMMEDIATELY when reaching finish line
    if (positionRef.current >= FINISH_LINE && !hasFinishedRef.current) {
      const elapsed = (Date.now() - raceStartTimeRef.current) / 1000;
      finishRace(elapsed);
    }
  }, [finishRace]);

  const startGame = () => {
    // Reset all state
    positionRef.current = 0;
    setPosition(0);
    setTapCount(0);
    setRaceTime(0);
    setFinalTime(null);
    setDiamondsWon(0);
    hasFinishedRef.current = false;
    
    // Start countdown
    setGameState('countdown');
    gameStateRef.current = 'countdown';
    setCountdown(3);
    audioManager.playSFX('buttonPress');

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count > 0) {
        audioManager.playSFX('coin');
      } else {
        clearInterval(countdownInterval);
        startRacing();
      }
    }, 1000);
  };

  const startRacing = () => {
    setGameState('racing');
    gameStateRef.current = 'racing';
    raceStartTimeRef.current = Date.now();
    audioManager.playSFX('spin');

    // Game loop using setInterval for reliable timing
    gameLoopRef.current = window.setInterval(() => {
      if (gameStateRef.current !== 'racing') {
        clearInterval(gameLoopRef.current);
        return;
      }

      const elapsed = (Date.now() - raceStartTimeRef.current) / 1000;
      setRaceTime(elapsed);

      // Check finish in game loop as backup
      if (positionRef.current >= FINISH_LINE && !hasFinishedRef.current) {
        finishRace(elapsed);
      }
    }, 50);
  };

  const resetGame = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    positionRef.current = 0;
    setPosition(0);
    setGameState('waiting');
    gameStateRef.current = 'waiting';
    hasFinishedRef.current = false;
    setTapCount(0);
    setRaceTime(0);
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
      ctx.textAlign = 'center';
      ctx.fillText('🏁 FINISH', finishX, laneY - 25);
      ctx.textAlign = 'left';

      // Player bull position
      const currentPos = positionRef.current;
      const playerX = 50 + (currentPos / 100) * (W - 100);
      const playerY = laneY + laneHeight / 2;

      // Speed trail effect
      if (currentPos > 5) {
        const trailGrad = ctx.createLinearGradient(playerX - 80, 0, playerX, 0);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, 'rgba(0, 212, 255, 0.4)');
        ctx.fillStyle = trailGrad;
        ctx.fillRect(playerX - 80, playerY - 15, 80, 30);
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

      // Progress bar
      ctx.fillStyle = '#333';
      ctx.fillRect(20, 10, W - 40, 15);
      ctx.fillStyle = '#00D4FF';
      ctx.fillRect(20, 10, ((W - 40) * currentPos) / 100, 15);
      ctx.strokeStyle = '#00D4FF';
      ctx.strokeRect(20, 10, W - 40, 15);

      // Stats
      ctx.fillStyle = '#00D4FF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Progress: ${Math.floor(currentPos)}%`, 20, 45);
      ctx.fillText(`Taps: ${tapCount}`, 20, 65);

      // Race time
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${raceTime.toFixed(2)}s`, W - 20, 45);
      ctx.textAlign = 'left';

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), W / 2, H / 2 + 40);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00D4FF';
        ctx.fillText('GET READY!', W / 2, H / 2 - 60);
        ctx.textAlign = 'left';
      }

      // Victory overlay
      if (gameState === 'finished') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('🏆 VICTORY! 🏆', W / 2, H / 2 - 40);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00D4FF';
        ctx.fillText(username, W / 2, H / 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Time: ${finalTime?.toFixed(2)}s`, W / 2, H / 2 + 35);
        ctx.fillStyle = '#00FF88';
        ctx.fillText(`+${diamondsWon} 💎 DIAMONDS!`, W / 2, H / 2 + 70);
        ctx.textAlign = 'left';
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [position, countdown, gameState, raceTime, tapCount, finalTime, diamondsWon, username]);

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
            onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
          />
        </Card>

        {/* Controls */}
        {gameState === 'waiting' && (
          <Card className="p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30">
            <Button
              onClick={startGame}
              className="w-full h-16 text-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
            >
              <Play className="w-6 h-6 mr-2" />
              Start Race
            </Button>
          </Card>
        )}

        {gameState === 'racing' && (
          <Card className="p-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30 text-center">
            <p className="text-2xl font-bold text-green-400 mb-2">TAP TAP TAP!</p>
            <p className="text-green-300 mb-4">Click or tap as fast as possible!</p>
            <Button
              className="h-24 w-full text-3xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
              onClick={handleTap}
              onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
            >
              🐂 TAP TO RUN! 🐂
            </Button>
          </Card>
        )}

        {gameState === 'finished' && (
          <Card className="p-6 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-500/30 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">🏆 VICTORY! 🏆</h2>
            <p className="text-xl text-purple-300 mb-1">{username}</p>
            <p className="text-2xl text-white mb-2">Time: {finalTime?.toFixed(2)}s</p>
            <p className="text-lg text-purple-300 mb-2">Taps: {tapCount}</p>
            <p className="text-2xl text-green-400 font-bold mb-4">+{diamondsWon} 💎 Added to Wallet!</p>
            <Button
              onClick={resetGame}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
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
              <div key={entry.id} className="flex justify-between items-center text-sm bg-purple-900/30 px-3 py-2 rounded">
                <span className="text-purple-300">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.username}
                </span>
                <span className="text-yellow-400 font-bold">{entry.time.toFixed(2)}s</span>
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
            <li>⚡ Tap/click as fast as possible to move the bull</li>
            <li>🐂 Each tap moves you closer to the finish line</li>
            <li>🏁 Reach the finish line to win!</li>
            <li>💎 Faster times = more diamonds!</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
