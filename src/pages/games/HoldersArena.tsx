import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Crown, Gem, Zap, Target, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreditBar } from "@/components/CreditBar";

type GameType = 'menu' | 'gem-tap' | 'bull-slots' | 'lucky-pick';

export default function HoldersArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bullsOwned, setBullsOwned] = useState(0);
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  
  // Game states
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", variant: "destructive" });
        navigate('/games/bull-world');
        return;
      }
      
      setUserId(user.id);
      
      const { data: nftData } = await supabase
        .from('user_nft_bonuses')
        .select('bulls_owned')
        .eq('user_id', user.id)
        .single();
      
      if (!nftData || (nftData as any).bulls_owned === 0) {
        toast({ 
          title: "🔒 Holders Only", 
          description: "You need to hold a CSB Bull NFT to access this arena!", 
          variant: "destructive" 
        });
        navigate('/games/bull-world');
        return;
      }
      
      setBullsOwned((nftData as any).bulls_owned);
      setIsLoading(false);
    };
    
    init();
  }, []);

  const awardDiamonds = async (amount: number) => {
    if (!userId || amount <= 0) return;
    
    const { data: current } = await supabase
      .from('user_diamonds')
      .select('balance, total_earned')
      .eq('user_id', userId)
      .single();
    
    if (current) {
      await supabase
        .from('user_diamonds')
        .update({ 
          balance: ((current as any).balance || 0) + amount,
          total_earned: ((current as any).total_earned || 0) + amount
        })
        .eq('user_id', userId);
      
      toast({ title: `+${amount} 💎`, description: "Diamonds added!" });
    }
  };

  const goBack = () => {
    if (currentGame !== 'menu') {
      setCurrentGame('menu');
      setGameActive(false);
      setScore(0);
    } else {
      const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
      navigate(fromBullWorld ? '/games/bull-world' : '/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Card className="p-8 text-center bg-[#0d2137] border-[#FFD700]/30">
          <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-[#FFD700]">Entering Holders Arena...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-[#FFD700] hover:bg-[#FFD700]/10" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {currentGame !== 'menu' ? 'Back' : 'Exit'}
          </Button>
          <CreditBar />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-[#FFD700]" />
            Holders Arena
            <Crown className="w-6 h-6 text-[#FFD700]" />
          </h1>
          <p className="text-[#FFD700]/60 text-sm">Exclusive for {bullsOwned} Bull holders!</p>
        </div>

        {currentGame === 'menu' && (
          <GameMenu onSelectGame={setCurrentGame} />
        )}
        
        {currentGame === 'gem-tap' && (
          <GemTapGame 
            score={score} 
            setScore={setScore}
            gameActive={gameActive}
            setGameActive={setGameActive}
            timeLeft={timeLeft}
            setTimeLeft={setTimeLeft}
            onEnd={awardDiamonds}
          />
        )}
        
        {currentGame === 'bull-slots' && (
          <BullSlotsGame onWin={awardDiamonds} />
        )}
        
        {currentGame === 'lucky-pick' && (
          <LuckyPickGame onWin={awardDiamonds} />
        )}
      </div>
    </div>
  );
}

// Game Menu Component
function GameMenu({ onSelectGame }: { onSelectGame: (game: GameType) => void }) {
  const games = [
    { id: 'gem-tap' as GameType, name: 'Gem Tap', icon: Gem, desc: 'Tap gems as fast as you can!', color: '#00D4FF' },
    { id: 'bull-slots' as GameType, name: 'Bull Slots', icon: Coins, desc: 'Spin for diamond rewards!', color: '#FFD700' },
    { id: 'lucky-pick' as GameType, name: 'Lucky Pick', icon: Target, desc: 'Pick the winning card!', color: '#22c55e' },
  ];

  return (
    <div className="space-y-4">
      {games.map(game => (
        <Card 
          key={game.id}
          className="p-4 bg-[#0d2137] border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ borderColor: game.color + '50' }}
          onClick={() => onSelectGame(game.id)}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: game.color + '20' }}
            >
              <game.icon className="w-7 h-7" style={{ color: game.color }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{game.name}</h3>
              <p className="text-sm text-gray-400">{game.desc}</p>
            </div>
            <Zap className="w-5 h-5 text-[#FFD700]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Game 1: Gem Tap - Tap appearing gems
function GemTapGame({ 
  score, setScore, gameActive, setGameActive, timeLeft, setTimeLeft, onEnd 
}: {
  score: number;
  setScore: (s: number | ((p: number) => number)) => void;
  gameActive: boolean;
  setGameActive: (a: boolean) => void;
  timeLeft: number;
  setTimeLeft: (t: number | ((p: number) => number)) => void;
  onEnd: (diamonds: number) => void;
}) {
  const [gems, setGems] = useState<{id: number; x: number; y: number; value: number}[]>([]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    spawnGem();
  };

  const spawnGem = () => {
    const newGem = {
      id: Date.now(),
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 70,
      value: Math.random() > 0.8 ? 5 : 1
    };
    setGems(prev => [...prev.slice(-4), newGem]);
  };

  const tapGem = (gemId: number, value: number) => {
    if (!gameActive) return;
    setGems(prev => prev.filter(g => g.id !== gemId));
    setScore(prev => prev + value);
    spawnGem();
  };

  useEffect(() => {
    if (!gameActive) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          const reward = Math.floor(score / 3);
          onEnd(reward);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawner = setInterval(spawnGem, 1500);
    
    return () => {
      clearInterval(timer);
      clearInterval(spawner);
    };
  }, [gameActive, score]);

  return (
    <Card className="p-4 bg-[#0d2137] border-[#00D4FF]/30">
      <div className="flex justify-between mb-4">
        <span className="text-white font-bold">Score: {score}</span>
        <span className="text-[#00D4FF] font-bold">⏱️ {timeLeft}s</span>
      </div>
      
      <div className="relative w-full h-80 bg-[#0a1628] rounded-xl overflow-hidden border border-[#00D4FF]/20">
        {!gameActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button 
              onClick={startGame}
              className="bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-black font-bold text-lg px-8 py-6"
            >
              {timeLeft === 0 ? `Play Again (Won ${Math.floor(score/3)}💎)` : 'Start Game'}
            </Button>
          </div>
        )}
        
        {gameActive && gems.map(gem => (
          <button
            key={gem.id}
            onClick={() => tapGem(gem.id, gem.value)}
            className="absolute w-14 h-14 text-3xl animate-pulse hover:scale-125 transition-transform"
            style={{ left: `${gem.x}%`, top: `${gem.y}%` }}
          >
            {gem.value > 1 ? '💎' : '✨'}
          </button>
        ))}
      </div>
    </Card>
  );
}

// Game 2: Bull Slots - Simple slot machine
function BullSlotsGame({ onWin }: { onWin: (diamonds: number) => void }) {
  const symbols = ['🐂', '💎', '🪙', '⭐', '👑'];
  const [reels, setReels] = useState(['🐂', '🐂', '🐂']);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setLastWin(0);
    
    let spins = 0;
    const maxSpins = 15;
    
    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
      spins++;
      
      if (spins >= maxSpins) {
        clearInterval(interval);
        
        // Final result with weighted odds
        const finalReels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ];
        
        // 15% chance for a match
        if (Math.random() < 0.15) {
          const winner = symbols[Math.floor(Math.random() * symbols.length)];
          finalReels[0] = winner;
          finalReels[1] = winner;
          finalReels[2] = winner;
        }
        
        setReels(finalReels);
        setSpinning(false);
        
        // Check win
        if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
          const prize = finalReels[0] === '💎' ? 25 : finalReels[0] === '👑' ? 50 : 10;
          setLastWin(prize);
          onWin(prize);
        }
      }
    }, 100);
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#FFD700]/30 text-center">
      <h3 className="text-xl font-bold text-[#FFD700] mb-4">🎰 Bull Slots 🎰</h3>
      
      <div className="flex justify-center gap-3 mb-6">
        {reels.map((symbol, i) => (
          <div 
            key={i}
            className={`w-20 h-20 bg-[#0a1628] rounded-xl border-2 border-[#FFD700]/50 flex items-center justify-center text-4xl ${spinning ? 'animate-bounce' : ''}`}
          >
            {symbol}
          </div>
        ))}
      </div>
      
      {lastWin > 0 && (
        <p className="text-2xl font-bold text-[#22c55e] mb-4 animate-pulse">
          🎉 WIN: +{lastWin} 💎
        </p>
      )}
      
      <Button 
        onClick={spin}
        disabled={spinning}
        className="bg-[#FFD700] hover:bg-[#FFD700]/80 text-black font-bold text-lg px-12 py-6"
      >
        {spinning ? 'Spinning...' : 'SPIN FREE'}
      </Button>
      
      <p className="text-gray-400 text-sm mt-4">Match 3 to win diamonds!</p>
    </Card>
  );
}

// Game 3: Lucky Pick - Pick a card
function LuckyPickGame({ onWin }: { onWin: (diamonds: number) => void }) {
  const [cards, setCards] = useState([false, false, false, false]);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [winningCard, setWinningCard] = useState(0);
  const [prize, setPrize] = useState(0);
  const [canPick, setCanPick] = useState(true);

  const resetGame = () => {
    setCards([false, false, false, false]);
    setRevealed(null);
    setWinningCard(Math.floor(Math.random() * 4));
    setPrize([5, 10, 15, 25][Math.floor(Math.random() * 4)]);
    setCanPick(true);
  };

  useEffect(() => {
    resetGame();
  }, []);

  const pickCard = (index: number) => {
    if (!canPick || revealed !== null) return;
    setCanPick(false);
    setRevealed(index);
    
    if (index === winningCard) {
      onWin(prize);
    }
    
    // Reveal all after delay
    setTimeout(() => {
      setCards([true, true, true, true]);
    }, 1000);
  };

  return (
    <Card className="p-6 bg-[#0d2137] border-[#22c55e]/30 text-center">
      <h3 className="text-xl font-bold text-[#22c55e] mb-2">🎯 Lucky Pick 🎯</h3>
      <p className="text-gray-400 text-sm mb-4">Pick the winning card to win {prize} 💎</p>
      
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-xs mx-auto">
        {cards.map((isRevealed, i) => (
          <button
            key={i}
            onClick={() => pickCard(i)}
            disabled={!canPick}
            className={`h-24 rounded-xl text-4xl transition-all ${
              isRevealed || revealed === i
                ? i === winningCard
                  ? 'bg-[#22c55e] scale-105'
                  : 'bg-red-500/50'
                : 'bg-[#0a1628] border-2 border-[#22c55e]/50 hover:border-[#22c55e] hover:scale-105'
            }`}
          >
            {isRevealed || revealed === i ? (
              i === winningCard ? '💎' : '❌'
            ) : (
              '❓'
            )}
          </button>
        ))}
      </div>
      
      {revealed !== null && (
        <div className="mb-4">
          {revealed === winningCard ? (
            <p className="text-2xl font-bold text-[#22c55e] animate-pulse">
              🎉 YOU WON +{prize} 💎!
            </p>
          ) : (
            <p className="text-lg text-red-400">Try again!</p>
          )}
        </div>
      )}
      
      {revealed !== null && (
        <Button 
          onClick={resetGame}
          className="bg-[#22c55e] hover:bg-[#22c55e]/80 text-black font-bold"
        >
          Play Again
        </Button>
      )}
    </Card>
  );
}
