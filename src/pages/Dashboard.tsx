import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gem, Coins, Dices, Flame, CreditCard, TrendingUp, CircleDollarSign, Spade, Target, ArrowUpDown, Pickaxe, TrendingDown, Grid3x3, PlayCircle, Award, Sparkles, Zap, BadgeDollarSign, Plane } from "lucide-react";
import { CreditBar } from "@/components/CreditBar";
import { CardanoWalletConnector } from "@/components/CardanoWalletConnector";
import { ColorSelector } from "@/components/ColorSelector";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isConnected } = useCardanoWallet();
  const { toast } = useToast();
  const [isSwapping, setIsSwapping] = useState(false);

  const games = [
    { id: "slots", name: "Bull Slots 🐂", icon: CircleDollarSign, description: "Spin the reels for jackpot rewards", color: "from-yellow-500 to-orange-500" },
    { id: "blackjack", name: "Blackjack 🐂", icon: Spade, description: "Beat the dealer to 21", color: "from-zinc-800 to-zinc-600" },
    { id: "roulette", name: "Roulette 🐂", icon: Target, description: "Spin the wheel of fortune", color: "from-red-600 to-rose-500" },
    { id: "plinko", name: "Plinko 🐂", icon: TrendingDown, description: "Drop and win multipliers", color: "from-cyan-500 to-blue-600" },
    { id: "coin-flip", name: "Coin Flip 🐂", icon: Coins, description: "Heads or tails, double or nothing", color: "from-amber-500 to-yellow-600" },
    { id: "hi-lo", name: "Hi-Lo 🐂", icon: ArrowUpDown, description: "Guess higher or lower", color: "from-violet-500 to-purple-600" },
    { id: "mines", name: "Mines 🐂", icon: Pickaxe, description: "Find gems, avoid bombs", color: "from-emerald-500 to-green-600" },
    { id: "crash", name: "Crash 🐂", icon: TrendingUp, description: "Cash out before the crash", color: "from-orange-500 to-red-600" },
    { id: "keno", name: "Keno 🐂", icon: Grid3x3, description: "Pick numbers and win big", color: "from-pink-500 to-rose-600" },
    { id: "number-bet", name: "Number Bet 🐂", icon: Dices, description: "Bet on lucky numbers", color: "from-blue-500 to-purple-500" },
    { id: "card-flip", name: "Card Flip 🐂", icon: CreditCard, description: "Match the bulls and win", color: "from-green-500 to-teal-500" },
    { id: "bull-run", name: "Bull Run 🐂", icon: TrendingUp, description: "Race to the finish line", color: "from-red-500 to-pink-500" },
    { id: "dice-roll", name: "Dice Roll 🐂", icon: Flame, description: "Roll your way to victory", color: "from-purple-500 to-indigo-500" },
    { id: "baccarat", name: "Baccarat 🐂", icon: Spade, description: "Player, Banker, or Tie", color: "from-slate-700 to-slate-500" },
    { id: "wheel-of-fortune", name: "Wheel of Fortune 🐂", icon: Target, description: "Spin the mega wheel", color: "from-pink-600 to-purple-600" },
    { id: "scratch", name: "Scratch Card 🐂", icon: Award, description: "Scratch and match symbols", color: "from-amber-600 to-yellow-500" },
    { id: "limbo", name: "Limbo 🐂", icon: TrendingUp, description: "Set your target multiplier", color: "from-cyan-600 to-blue-700" },
    { id: "video-poker", name: "Video Poker 🐂", icon: PlayCircle, description: "Hold and draw to win", color: "from-indigo-600 to-purple-700" },
    { id: "sic-bo", name: "Sic Bo 🐂", icon: Dices, description: "Three dice betting", color: "from-rose-600 to-red-700" },
    { id: "dragon-tiger", name: "Dragon Tiger 🐂", icon: Zap, description: "Fast-paced card showdown", color: "from-orange-600 to-red-600" },
    { id: "aviator", name: "Aviator 🐂", icon: Plane, description: "Cash out before crash", color: "from-sky-500 to-blue-600" },
    { id: "texas-holdem", name: "Texas Hold'em 🐂", icon: Sparkles, description: "Classic poker showdown", color: "from-green-700 to-emerald-600" },
    { id: "three-card-poker", name: "3-Card Poker 🐂", icon: BadgeDollarSign, description: "Quick poker action", color: "from-teal-600 to-cyan-600" },
    { id: "war", name: "War 🐂", icon: Target, description: "Highest card wins", color: "from-red-700 to-orange-700" },
    // Add more games here - condensed for brevity
  ];

  const handleGameClick = (gameId: string) => {
    if (!isConnected) {
      toast({
        title: "Wallet Required 🔒",
        description: "Please connect your Cardano wallet to play games",
        variant: "destructive",
      });
      return;
    }
    navigate(`/games/${gameId}`);
  };

  const handleSwap = async (creditsCost: number, diamondsAmount: number) => {
    if (!isConnected) {
      toast({
        title: "Wallet Required 🔒",
        description: "Please connect your wallet to swap",
        variant: "destructive",
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Fetch both credits and diamonds in parallel
      const [creditsResult, diamondsResult] = await Promise.all([
        supabase.from('user_credits' as any).select('balance').eq('user_id', user.id).single(),
        supabase.from('user_diamonds' as any).select('balance, total_earned').eq('user_id', user.id).single()
      ]);

      if (!(creditsResult.data as any) || (creditsResult.data as any).balance < creditsCost) {
        toast({
          title: "Not Enough Credits! 💰",
          description: `You need ${creditsCost} credits for this swap`,
          variant: "destructive",
        });
        setIsSwapping(false);
        return;
      }

      // Update both in parallel for instant response
      const [creditsUpdate, diamondsUpdate] = await Promise.all([
        supabase.from('user_credits' as any)
          .update({ balance: (creditsResult.data as any).balance - creditsCost })
          .eq('user_id', user.id),
        supabase.from('user_diamonds' as any)
          .update({ 
            balance: ((diamondsResult.data as any)?.balance || 0) + diamondsAmount,
            total_earned: ((diamondsResult.data as any)?.total_earned || 0) + diamondsAmount
          })
          .eq('user_id', user.id)
      ]);

      if (creditsUpdate.error) throw creditsUpdate.error;
      if (diamondsUpdate.error) throw diamondsUpdate.error;

      toast({
        title: "Swap Successful! 🎉",
        description: `Traded ${creditsCost} credits for ${diamondsAmount} 💎`,
      });

    } catch (error) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleDiamondToKeySwap = async (diamondsCost: number, keysAmount: number) => {
    if (!isConnected) {
      toast({
        title: "Wallet Required 🔒",
        description: "Please connect your wallet to swap",
        variant: "destructive",
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Fetch diamonds balance
      const diamondsResult = await supabase
        .from('user_diamonds' as any)
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!(diamondsResult.data as any) || (diamondsResult.data as any).balance < diamondsCost) {
        toast({
          title: "Not Enough Diamonds! 💎",
          description: `You need ${diamondsCost.toLocaleString()} diamonds for this swap`,
          variant: "destructive",
        });
        setIsSwapping(false);
        return;
      }

      // Deduct diamonds
      const diamondsUpdate = await supabase
        .from('user_diamonds' as any)
        .update({ balance: (diamondsResult.data as any).balance - diamondsCost })
        .eq('user_id', user.id);

      if (diamondsUpdate.error) throw diamondsUpdate.error;

      // Upsert keys (insert if not exists, update if exists)
      const { data: existingKeys } = await supabase
        .from('user_keys' as any)
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingKeys && (existingKeys as any).balance !== undefined) {
        // Update existing
        const keysUpdate = await supabase
          .from('user_keys' as any)
          .update({ balance: (existingKeys as any).balance + keysAmount })
          .eq('user_id', user.id);
        
        if (keysUpdate.error) throw keysUpdate.error;
      } else {
        // Insert new
        const keysInsert = await supabase
          .from('user_keys' as any)
          .insert({ user_id: user.id, balance: keysAmount });
        
        if (keysInsert.error) throw keysInsert.error;
      }

      toast({
        title: "Swap Successful! 🎉",
        description: `Traded ${diamondsCost.toLocaleString()} 💎 for ${keysAmount} 🔑`,
      });

      // Refresh page to update all displays
      window.location.reload();

    } catch (error) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">
                Cardano Stake Bulls
              </h1>
            </div>
            {isConnected && <CreditBar />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Wallet Connector & Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Connection Card */}
            {!isConnected ? (
              <Card className="p-6 bg-gradient-to-br from-primary/20 to-card border-2 border-primary/40">
                <h3 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-4">
                  Connect Wallet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Cardano wallet to start playing
                </p>
                <CardanoWalletConnector 
                  variant="gold"
                  size="lg"
                  className="w-full"
                />
              </Card>
            ) : (
              <Card className="p-6 bg-gradient-to-br from-primary/20 to-card border-2 border-primary/40">
                <h3 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-4">
                  Welcome to Cardano Stake Bulls Game Zone 💎🐂
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your wallet is connected! Start playing and earning diamonds!
                </p>
                <div className="mt-4">
                  <CardanoWalletConnector 
                    variant="gold"
                    size="sm"
                    className="w-full"
                  />
                </div>
              </Card>
            )}

          {/* Color Selector */}
          <ColorSelector />

          {/* Leaderboard */}
          <Leaderboard />

            {/* Purchase Diamonds */}
            <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <Gem className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-foreground">Get Diamonds</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Trade credits for diamonds
              </p>
              <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-foreground">100 Credits</span>
                  <span className="text-sm font-semibold gradient-gold bg-clip-text text-transparent">
                    5 💎
                  </span>
                </div>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleSwap(100, 5)}
                  disabled={isSwapping || !isConnected}
                >
                  Swap Now
                </Button>
              </div>
            </Card>
          </div>

          {/* Diamond to Keys Swap */}
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-accent/30 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">🔑</div>
              <h3 className="text-xl font-bold text-foreground">Get Keys</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Trade diamonds for keys to unlock the Wheel of Fortune!
            </p>
            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-foreground">1,000,000 💎</span>
                <span className="text-sm font-semibold gradient-gold bg-clip-text text-transparent">
                  1 🔑
                </span>
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleDiamondToKeySwap(1000000, 1)}
                disabled={isSwapping || !isConnected}
              >
                Get Key
              </Button>
            </div>
          </Card>

          {/* Wheel of Fortune */}
          <Card 
            className="group overflow-hidden bg-card border-4 border-accent hover:border-primary hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl max-w-md mx-auto"
            onClick={() => navigate('/games/wheel-of-fortune')}
          >
            <div className="h-40 bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center relative">
              <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
                COSMETIC!
              </div>
              <Target className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 text-foreground">🎯 Wheel of Fortune</h3>
              <p className="text-sm text-muted-foreground mb-4">Spin for exclusive neon name colors! Stand out on the leaderboard!</p>
              <Button variant="outline" size="sm" className="w-full">
                Spin the Wheel
              </Button>
            </div>
          </Card>

          {/* Diamond Earning Games */}
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-gold bg-clip-text text-transparent">
              💎 Earn Diamonds & Credits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                className="group overflow-hidden bg-card border-4 border-primary hover:border-accent hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/bull-mining')}
              >
                <div className="h-40 bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
                    NEW!
                  </div>
                  <Pickaxe className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🐂 Bull Mining Idle</h3>
                  <p className="text-sm text-muted-foreground mb-4">Bulls work together mining diamonds & credits!</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Start Mining
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-primary hover:border-accent hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/milk-the-bull')}
              >
                <div className="h-40 bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
                    NEW!
                  </div>
                  <Gem className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🥛 Milk The Bull</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click to milk! Build streaks for bonuses!</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Start Milking
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-primary hover:border-accent hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/bull-kingdom')}
              >
                <div className="h-40 bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">
                    NEW!
                  </div>
                  <Trophy className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🏰 Bull Kingdom</h3>
                  <p className="text-sm text-muted-foreground mb-4">Build your empire & earn passive rewards!</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Build Kingdom
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Advanced Key-Only Games */}
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-gold bg-clip-text text-transparent text-center">
              🔑 Advanced Key-Only Games
            </h2>
            <p className="text-center text-muted-foreground mb-6">
              Exclusive games requiring keys. Higher stakes, bigger rewards!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/bull-gauntlet')}
              >
                <div className="h-40 bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Trophy className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">⚔️ Bull Gauntlet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Battle through waves for massive rewards!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Enter Arena
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/diamond-fortress')}
              >
                <div className="h-40 bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Gem className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">💎 Diamond Fortress</h3>
                  <p className="text-sm text-muted-foreground mb-4">Defend and collect diamonds in waves!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Enter Fortress
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/treasure-vault')}
              >
                <div className="h-40 bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Coins className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🏆 Treasure Vault</h3>
                  <p className="text-sm text-muted-foreground mb-4">Unlock chests for legendary prizes!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Enter Vault
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/cosmic-gauntlet')}
              >
                <div className="h-40 bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Trophy className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🚀 Cosmic Gauntlet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Navigate space for cosmic rewards!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Launch Mission
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/fortune-trial')}
              >
                <div className="h-40 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Coins className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🎲 Fortune's Trial</h3>
                  <p className="text-sm text-muted-foreground mb-4">Risk vs Reward - Choose wisely!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Begin Trial
                  </Button>
                </div>
              </Card>

              <Card
                className="group overflow-hidden bg-card border-4 border-yellow-500 hover:border-yellow-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
                onClick={() => navigate('/games/shadow-vault')}
              >
                <div className="h-40 bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center relative">
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    🔑 KEY REQUIRED
                  </div>
                  <Gem className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">🌑 Shadow Vault</h3>
                  <p className="text-sm text-muted-foreground mb-4">Progressive mystery boxes & tiers!</p>
                  <Button variant="outline" size="sm" className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                    Enter Shadows
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Link to Casino Games */}
          <div className="text-center">
            <Card className="inline-block p-8 bg-gradient-to-r from-primary/20 to-card border-2 border-primary/40">
              <p className="text-3xl font-bold gradient-gold bg-clip-text text-transparent mb-3">🎰 100+ Free Casino Games! 🎮</p>
              <p className="text-muted-foreground mb-6">Play classic casino games for free - no wallet needed!</p>
              <Button 
                size="lg" 
                onClick={() => navigate("/games")}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                Free Game Zone →
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
