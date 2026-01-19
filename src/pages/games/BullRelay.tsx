import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Play, Repeat, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

interface RelayRunner {
  id: number;
  name: string;
  color: string;
  emoji: string;
  stamina: number;
  speed: number;
}

const TEAM_COLORS = ['#00D4FF', '#FF6B35', '#44FF44', '#FF44FF'];
const RUNNER_EMOJIS = ['🐂', '🐃', '🦬', '🐄'];

export default function BullRelay() {
  const { goBack } = useBullWorldNavigation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<"setup" | "countdown" | "racing" | "finished">("setup");
  const [countdown, setCountdown] = useState(3);
  const [currentRunner, setCurrentRunner] = useState(0);
  const [runnerPositions, setRunnerPositions] = useState([0, 0, 0, 0]);
  const [teamTime, setTeamTime] = useState(0);
  const [legTimes, setLegTimes] = useState<number[]>([]);
  const [stamina, setStamina] = useState(100);
  const [isSprinting, setIsSprinting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [runners, setRunners] = useState<RelayRunner[]>([
    { id: 0, name: 'Starter', color: TEAM_COLORS[0], emoji: RUNNER_EMOJIS[0], stamina: 100, speed: 1 },
    { id: 1, name: 'Speedster', color: TEAM_COLORS[1], emoji: RUNNER_EMOJIS[1], stamina: 80, speed: 1.3 },
    { id: 2, name: 'Endurance', color: TEAM_COLORS[2], emoji: RUNNER_EMOJIS[2], stamina: 120, speed: 0.9 },
    { id: 3, name: 'Finisher', color: TEAM_COLORS[3], emoji: RUNNER_EMOJIS[3], stamina: 90, speed: 1.2 },
  ]);

  const raceStartTime = useRef<number>(0);
  const legStartTime = useRef<number>(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const isSprintingRef = useRef(false);
  const currentRunnerRef = useRef(0);
  const staminaRef = useRef(100);
  const runnersRef = useRef(runners);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first!");
        goBack();
        return;
      }
      setUserId(user.id);
      fetchLeaderboard();
    };

    init();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('game_results')
      .select('*, profiles:user_id(username)')
      .eq('game_name', 'Bull Relay')
      .eq('result', 'win')
      .order('multiplier', { ascending: true })
      .limit(10);
    
    if (data) setLeaderboard(data as any[]);
  };

  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);
    setCurrentRunner(0);
    currentRunnerRef.current = 0;
    setRunnerPositions([0, 0, 0, 0]);
    setLegTimes([]);
    setStamina(runners[0].stamina);
    staminaRef.current = runners[0].stamina;
    isSprintingRef.current = false;
    runnersRef.current = runners;
    audioManager.playSFX('buttonPress');

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setGameState('racing');
          raceStartTime.current = Date.now();
          legStartTime.current = Date.now();
          startRaceLoop();
          return 0;
        }
        audioManager.playSFX('coin');
        return c - 1;
      });
    }, 1000);
  };

  const startRaceLoop = () => {
    gameLoopRef.current = setInterval(() => {
      const elapsed = (Date.now() - raceStartTime.current) / 1000;
      setTeamTime(elapsed);

      const runner = currentRunnerRef.current;
      const runnerData = runnersRef.current[runner];
      
      // Base movement - bulls always run forward automatically
      let moveSpeed = runnerData.speed * 1.2;
      
      // Sprint boost when holding button (uses stamina faster) - use ref!
      if (isSprintingRef.current && staminaRef.current > 0) {
        moveSpeed *= 3;
        staminaRef.current = Math.max(0, staminaRef.current - 2);
        setStamina(staminaRef.current);
      } else if (!isSprintingRef.current) {
        // Recover stamina when not sprinting
        staminaRef.current = Math.min(runnerData.stamina, staminaRef.current + 1);
        setStamina(staminaRef.current);
      }

      // Update position - bulls move automatically
      setRunnerPositions(prev => {
        const newPositions = [...prev];
        const oldPos = prev[runner];
        newPositions[runner] = Math.min(100, oldPos + moveSpeed);
        
        // Check if runner finished their leg
        if (newPositions[runner] >= 100 && oldPos < 100) {
          // Handle leg complete
          const legTime = (Date.now() - legStartTime.current) / 1000;
          setLegTimes(prevTimes => [...prevTimes, legTime]);
          audioManager.playSFX('levelUp');

          if (runner >= 3) {
            // Race finished!
            setTimeout(() => finishRace(), 100);
          } else {
            // Pass baton to next runner
            const nextRunner = runner + 1;
            currentRunnerRef.current = nextRunner;
            setCurrentRunner(nextRunner);
            staminaRef.current = runnersRef.current[nextRunner].stamina;
            setStamina(staminaRef.current);
            legStartTime.current = Date.now();
            toast.success(`🏃 Baton passed to ${runnersRef.current[nextRunner].name}!`);
          }
        }
        
        return newPositions;
      });
    }, 50);
  };

  const finishRace = async () => {
    setGameState('finished');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    
    const finalTime = (Date.now() - raceStartTime.current) / 1000;
    setTeamTime(finalTime);
    audioManager.playSFX('jackpot');

    if (userId) {
      const diamonds = Math.max(10, Math.floor(60 - finalTime));

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
        game_name: 'Bull Relay',
        result: 'win',
        diamonds_won: diamonds,
        multiplier: finalTime
      });

      toast.success(`🏆 Race Complete! Time: ${finalTime.toFixed(2)}s | +${diamonds} 💎`);
      fetchLeaderboard();
    }
  };

  const handleSprint = (sprinting: boolean) => {
    isSprintingRef.current = sprinting;
    setIsSprinting(sprinting);
  };

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const W = 800;
      const H = 500;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
      bgGrad.addColorStop(0, '#1a2a1a');
      bgGrad.addColorStop(0.5, '#2a4a2a');
      bgGrad.addColorStop(1, '#1a2a1a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw 4 lanes (one per runner)
      const laneHeight = 80;
      const startY = 80;

      for (let i = 0; i < 4; i++) {
        const y = startY + i * laneHeight;
        const isActive = i === currentRunner && gameState === 'racing';
        
        // Lane background
        ctx.fillStyle = isActive ? '#3a5a3a' : '#2a3a2a';
        ctx.fillRect(50, y, W - 100, laneHeight - 10);
        
        // Lane border
        ctx.strokeStyle = isActive ? '#44FF44' : '#4a5a4a';
        ctx.lineWidth = isActive ? 3 : 1;
        ctx.strokeRect(50, y, W - 100, laneHeight - 10);

        // Runner name
        ctx.fillStyle = runners[i].color;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`${runners[i].emoji} ${runners[i].name}`, 60, y + 20);

        // Progress bar background
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(60, y + 35, W - 140, 20);
        
        // Progress bar fill
        const progress = runnerPositions[i] / 100;
        ctx.fillStyle = runners[i].color;
        ctx.fillRect(60, y + 35, (W - 140) * progress, 20);

        // Finish marker
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(W - 80, y + 30, 4, 30);

        // Runner bull
        const runnerX = 60 + (W - 140) * progress;
        ctx.font = '24px Arial';
        ctx.fillText(runners[i].emoji, runnerX - 12, y + 52);

        // Completed marker
        if (runnerPositions[i] >= 100) {
          ctx.fillStyle = '#44FF44';
          ctx.font = 'bold 12px Arial';
          ctx.fillText('✓ DONE', W - 70, y + 20);
        }
      }

      // Baton zone indicators
      for (let i = 0; i < 3; i++) {
        const zoneX = W - 80;
        const zoneY = startY + i * laneHeight + laneHeight - 5;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(zoneX - 30, zoneY - 5, 60, laneHeight);
        ctx.strokeStyle = '#FFD700';
        ctx.strokeRect(zoneX - 30, zoneY - 5, 60, laneHeight);
      }

      // Current runner info panel
      if (gameState === 'racing') {
        const runner = runners[currentRunner];
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(W - 200, H - 120, 180, 100);
        ctx.strokeStyle = runner.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(W - 200, H - 120, 180, 100);

        ctx.fillStyle = runner.color;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${runner.emoji} ${runner.name}`, W - 190, H - 95);

        // Stamina bar
        ctx.fillStyle = '#333';
        ctx.fillRect(W - 190, H - 75, 160, 20);
        ctx.fillStyle = stamina > 30 ? '#44FF44' : '#FF4444';
        ctx.fillRect(W - 190, H - 75, 160 * (stamina / runner.stamina), 20);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`Stamina: ${Math.floor(stamina)}`, W - 180, H - 60);

        // Speed indicator
        ctx.fillStyle = isSprinting ? '#FFD700' : '#666';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(isSprinting ? '⚡ SPRINTING!' : '🏃 Running', W - 180, H - 40);
      }

      // Team time
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Team Time: ${teamTime.toFixed(2)}s`, W / 2, 50);

      // Leg times
      ctx.font = '14px Arial';
      ctx.fillStyle = '#44FF44';
      legTimes.forEach((time, i) => {
        ctx.fillText(`Leg ${i + 1}: ${time.toFixed(2)}s`, 120 + i * 150, H - 20);
      });
      ctx.textAlign = 'left';

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown.toString(), W / 2, H / 2 + 30);
        ctx.font = '24px Arial';
        ctx.fillText('Get Ready!', W / 2, H / 2 + 70);
        ctx.textAlign = 'left';
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [runnerPositions, currentRunner, stamina, isSprinting, teamTime, legTimes, countdown, gameState, runners]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2a1a] via-[#2a4a2a] to-[#1a2a1a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#44FF44]" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-green-400" />
            <span className="text-white font-bold">Bull Relay</span>
          </div>
        </div>

        {/* Title */}
        <Card className="mb-4 p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            🏃 Bull Relay Race 🏃
          </h1>
          <p className="text-center text-green-300 text-sm">Lead your team of 4 bulls to victory!</p>
        </Card>

        {/* Game Canvas */}
        <Card className="mb-4 p-2 bg-black/50 border-green-500/30 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="w-full rounded-lg"
          />
        </Card>

        {/* Controls */}
        {gameState === 'setup' && (
          <Button
            onClick={startGame}
            className="w-full h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
          >
            <Play className="w-6 h-6 mr-2" />
            Start Relay Race
          </Button>
        )}

        {gameState === 'racing' && (
          <div className="space-y-4">
            <Card className="p-4 bg-black/50 border-green-500/30">
              <p className="text-center text-green-400 mb-2">
                Hold SPRINT to run faster (uses stamina!)
              </p>
              <Button
                className={`w-full h-20 text-2xl transition-all ${
                  isSprinting 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 scale-95' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600'
                }`}
                onMouseDown={() => handleSprint(true)}
                onMouseUp={() => handleSprint(false)}
                onMouseLeave={() => handleSprint(false)}
                onTouchStart={() => handleSprint(true)}
                onTouchEnd={() => handleSprint(false)}
              >
                <Zap className="w-8 h-8 mr-2" />
                {isSprinting ? '⚡ SPRINTING!' : '🏃 HOLD TO SPRINT'}
              </Button>
            </Card>
          </div>
        )}

        {gameState === 'finished' && (
          <Card className="p-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold text-green-400 mb-2">Relay Complete!</h2>
            <p className="text-2xl text-white mb-2">Total Time: {teamTime.toFixed(2)}s</p>
            <div className="grid grid-cols-4 gap-2 my-4">
              {legTimes.map((time, i) => (
                <div key={i} className="bg-black/30 p-2 rounded">
                  <p className="text-xs text-green-400">{runners[i].emoji} Leg {i + 1}</p>
                  <p className="text-lg font-bold text-white">{time.toFixed(2)}s</p>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setGameState('setup')}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              Race Again
            </Button>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="mt-4 p-4 bg-black/30 border-green-500/30">
          <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Fastest Teams
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <span className="text-green-300">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.profiles?.username || 'Anonymous'}
                </span>
                <span className="text-yellow-400 font-bold">{entry.multiplier?.toFixed(2)}s</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-green-400/60 text-center">No times recorded yet!</p>
            )}
          </div>
        </Card>

        {/* Team Info */}
        <Card className="mt-4 p-4 bg-black/30 border-green-500/30">
          <h3 className="font-bold text-green-400 mb-2">Your Team</h3>
          <div className="grid grid-cols-4 gap-2">
            {runners.map((runner, i) => (
              <div key={i} className={`p-2 rounded text-center ${currentRunner === i && gameState === 'racing' ? 'bg-green-900/50 ring-2 ring-green-400' : 'bg-black/30'}`}>
                <p className="text-2xl">{runner.emoji}</p>
                <p className="text-xs font-bold" style={{ color: runner.color }}>{runner.name}</p>
                <p className="text-xs text-green-300">Speed: {runner.speed}x</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
