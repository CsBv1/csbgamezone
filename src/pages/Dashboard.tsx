import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gem, Coins, Flame, TrendingUp, Pickaxe, Target, Lock, Gauge, Globe, Users, ExternalLink, Key, Shield, Sparkles, Music, ChevronDown, Eye, Building2, Swords, Crown } from "lucide-react";
import { CreditBar } from "@/components/CreditBar";
import { CardanoWalletConnector } from "@/components/CardanoWalletConnector";
import { ColorSelectorDialog } from "@/components/ColorSelectorDialog";
import { BadgeSelectorDialog } from "@/components/BadgeSelectorDialog";
import { RuneSelectorDialog } from "@/components/RuneSelectorDialog";
import { DailyCalendar } from "@/components/DailyCalendar";
import { CSBGameMaster } from "@/components/CSBGameMaster";
import { NFTBonusDisplay } from "@/components/NFTBonusDisplay";
import { SubscriptionBox } from "@/components/SubscriptionBox";
import { EmailAuthForm } from "@/components/EmailAuthForm";
import { ProfileSettings } from "@/components/ProfileSettings";
import { VESPRDownloadButton } from "@/components/VESPRDownloadButton";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useAudioManager } from "@/hooks/useAudioManager";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import { GameCard } from "@/components/GameCard";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isConnected, connectedWallet } = useCardanoWallet();
  const { toast } = useToast();
  const [isSwapping, setIsSwapping] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  
  const { playSFX, startMusic } = useAudioManager();
  startMusic();
  
  const { bullsOwned, rarityBonus, highestRarity, isScanning, rescan } = useNFTBonuses(connectedWallet?.address || null);
  const { bulls: subscriptionBulls, subscribed } = useSubscription();
  const totalBulls = bullsOwned + subscriptionBulls;

  const handleSwap = async (creditsCost: number, diamondsAmount: number) => {
    if (!isConnected) { toast({ title: "Wallet Required 🔒", description: "Please connect your wallet to swap", variant: "destructive" }); return; }
    setIsSwapping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const [creditsResult, diamondsResult] = await Promise.all([
        supabase.from('user_credits' as any).select('balance').eq('user_id', user.id).single(),
        supabase.from('user_diamonds' as any).select('balance, total_earned').eq('user_id', user.id).single()
      ]);
      if (!(creditsResult.data as any) || (creditsResult.data as any).balance < creditsCost) {
        toast({ title: "Not Enough Credits! 💰", description: `You need ${creditsCost} credits`, variant: "destructive" });
        setIsSwapping(false); return;
      }
      const [creditUpdate, diamondUpdate] = await Promise.all([
        supabase.from('user_credits' as any).update({ balance: (creditsResult.data as any).balance - creditsCost }).eq('user_id', user.id),
        supabase.from('user_diamonds' as any).update({ balance: ((diamondsResult.data as any)?.balance || 0) + diamondsAmount, total_earned: ((diamondsResult.data as any)?.total_earned || 0) + diamondsAmount }).eq('user_id', user.id)
      ]);
      if (creditUpdate.error || diamondUpdate.error) throw new Error('Update failed');
      toast({ title: "Swap Successful! 🎉", description: `Traded ${creditsCost} credits for ${diamondsAmount} 💎` });
      setTimeout(() => window.location.reload(), 800);
    } catch (error) { toast({ title: "Swap Failed", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsSwapping(false); }
  };

  const handleCreditToBukalSwap = async (creditsCost: number, bukalsAmount: number) => {
    if (!isConnected) { toast({ title: "Wallet Required 🔒", description: "Please connect your wallet to swap", variant: "destructive" }); return; }
    setIsSwapping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const creditsResult = await supabase.from('user_credits' as any).select('balance').eq('user_id', user.id).single();
      if (!(creditsResult.data as any) || (creditsResult.data as any).balance < creditsCost) {
        toast({ title: "Not Enough Credits! 💰", description: `You need ${creditsCost.toLocaleString()} credits`, variant: "destructive" });
        setIsSwapping(false); return;
      }
      await supabase.from('user_credits' as any).update({ balance: (creditsResult.data as any).balance - creditsCost }).eq('user_id', user.id);
      const { data: existingBukals } = await supabase.from('user_bukals' as any).select('balance').eq('user_id', user.id).maybeSingle();
      if (existingBukals && (existingBukals as any).balance !== undefined) {
        await supabase.from('user_bukals' as any).update({ balance: (existingBukals as any).balance + bukalsAmount }).eq('user_id', user.id);
      } else {
        await supabase.from('user_bukals' as any).insert({ user_id: user.id, balance: bukalsAmount });
      }
      toast({ title: "Swap Successful! 🏆", description: `Traded ${creditsCost.toLocaleString()} credits for ${bukalsAmount} 🏆 Bukal!` });
      window.location.reload();
    } catch (error) { toast({ title: "Swap Failed", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsSwapping(false); }
  };

  const handleDiamondToKeySwap = async (diamondsCost: number, keysAmount: number) => {
    if (!isConnected) { toast({ title: "Wallet Required 🔒", description: "Please connect your wallet to swap", variant: "destructive" }); return; }
    setIsSwapping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const diamondsResult = await supabase.from('user_diamonds' as any).select('balance').eq('user_id', user.id).single();
      if (!(diamondsResult.data as any) || (diamondsResult.data as any).balance < diamondsCost) {
        toast({ title: "Not Enough Diamonds! 💎", description: `You need ${diamondsCost.toLocaleString()} diamonds`, variant: "destructive" });
        setIsSwapping(false); return;
      }
      await supabase.from('user_diamonds' as any).update({ balance: (diamondsResult.data as any).balance - diamondsCost }).eq('user_id', user.id);
      const { data: existingKeys } = await supabase.from('user_keys' as any).select('balance').eq('user_id', user.id).maybeSingle();
      if (existingKeys && (existingKeys as any).balance !== undefined) {
        await supabase.from('user_keys' as any).update({ balance: (existingKeys as any).balance + keysAmount }).eq('user_id', user.id);
      } else {
        await supabase.from('user_keys' as any).insert({ user_id: user.id, balance: keysAmount });
      }
      toast({ title: "Swap Successful! 🎉", description: `Traded ${diamondsCost.toLocaleString()} 💎 for ${keysAmount} 🔑` });
      window.location.reload();
    } catch (error) { toast({ title: "Swap Failed", description: "Something went wrong.", variant: "destructive" }); }
    finally { setIsSwapping(false); }
  };

  return (
    <div className="min-h-screen bull-pattern">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">Cardano Stake Bulls</h1>
            </div>
            {isConnected && <CreditBar />}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {!isConnected ? (
              <Card className="p-6 bg-gradient-to-br from-primary/20 to-card border-2 border-primary/40">
                <h3 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-4">Connect Wallet</h3>
                <p className="text-muted-foreground mb-4">Connect your Cardano wallet to start playing</p>
                <div className="space-y-3">
                  <CardanoWalletConnector variant="gold" size="lg" className="w-full" />
                  <VESPRDownloadButton className="w-full" />
                </div>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                </div>
                
                <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      ✉️ Email Login <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${emailOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <EmailAuthForm onSuccess={() => window.location.reload()} />
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ) : (
              <Card className="p-6 bg-gradient-to-br from-primary/20 to-card border-2 border-primary/40">
                <h3 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-4">Welcome to Cardano Stake Bulls Game Zone 💎🐂</h3>
                <p className="text-muted-foreground mb-4">Your wallet is connected! Start playing and earning diamonds!</p>
                <div className="space-y-3">
                  <CardanoWalletConnector variant="gold" size="sm" className="w-full" />
                  <div className="flex flex-wrap gap-2">
                    <ProfileSettings />
                    <ColorSelectorDialog />
                    <BadgeSelectorDialog />
                    <RuneSelectorDialog />
                    <DailyCalendar />
                  </div>
                </div>
              </Card>
            )}

            <Leaderboard />

            <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <Gem className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-foreground">Get Diamonds</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Trade credits for diamonds</p>
              <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-foreground">100 Credits</span>
                  <span className="text-sm font-semibold gradient-gold bg-clip-text text-transparent">5 💎</span>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleSwap(100, 5)} disabled={isSwapping || !isConnected}>Swap Now</Button>
              </div>
            </Card>
          </div>

          {/* Bukal & Key Swaps */}
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-yellow-500/30 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4"><div className="text-2xl">🏆</div><h3 className="text-xl font-bold text-foreground">Get Bukals</h3></div>
            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex justify-between items-center mb-2"><span className="text-sm text-foreground">1,000,000 Credits</span><span className="text-sm font-semibold gradient-gold bg-clip-text text-transparent">1 🏆</span></div>
              <Button size="sm" className="w-full" onClick={() => handleCreditToBukalSwap(1000000, 1)} disabled={isSwapping || !isConnected}>Get Bukal</Button>
            </div>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-accent/30 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4"><div className="text-2xl">🔑</div><h3 className="text-xl font-bold text-foreground">Get Keys</h3></div>
            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex justify-between items-center mb-2"><span className="text-sm text-foreground">1,000,000 💎</span><span className="text-sm font-semibold gradient-gold bg-clip-text text-transparent">1 🔑</span></div>
              <Button size="sm" className="w-full" onClick={() => handleDiamondToKeySwap(1000000, 1)} disabled={isSwapping || !isConnected}>Get Key</Button>
            </div>
          </Card>

          {/* Bull World — moved up */}
          <Card className={`group overflow-hidden bg-card border-4 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl ${totalBulls > 0 ? 'border-amber-400 animate-pulse-glow' : 'border-cyan-400 hover:border-cyan-300'}`}
            onClick={() => navigate('/games/bull-world')}>
            <div className="h-48 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-600 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-cyan-400 text-black px-3 py-1 rounded-full text-xs font-bold animate-pulse">🌍 MULTIPLAYER WORLD</div>
              <div className="absolute top-10 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">🔑 KEY REQUIRED</div>
              <div className="flex items-center gap-6">
                <Globe className="w-24 h-24 text-white group-hover:scale-110 transition-transform animate-pulse" />
                <Users className="w-16 h-16 text-cyan-300 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold mb-2 text-foreground">🐂 Bull World 🌍</h3>
              <p className="text-sm text-muted-foreground mb-4">Enter a virtual world! See other players, collect diamonds, explore & play mini-games together!</p>
              <Button variant="outline" size="lg" className="w-full border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black">Enter Bull World</Button>
            </div>
          </Card>

          {/* CSB Game Zone — $CsBv1 Web3 Portal — moved up */}
          <Card className="group overflow-hidden bg-card border-4 border-fuchsia-500 hover:border-fuchsia-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl"
            onClick={() => navigate('/csb')}>
            <div className="h-48 bg-gradient-to-br from-fuchsia-700 via-purple-700 to-cyan-700 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-fuchsia-400 text-black px-3 py-1 rounded-full text-xs font-bold animate-pulse">⚡ $CsBv1 WEB3</div>
              <div className="flex items-center gap-6">
                <Sparkles className="w-20 h-20 text-white group-hover:scale-110 transition-transform animate-pulse" />
                <Coins className="w-16 h-16 text-amber-300 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold mb-2 text-foreground">⚡ CSB Game Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">New Web3 token economy: missions, upgrades, NFT power & passive $CsBv1 claims. Earn real $CsBv1 — your bull NFTs boost every reward.</p>
              <Button variant="outline" size="lg" className="w-full border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-400 hover:text-black">Enter CSB Zone</Button>
            </div>
          </Card>

          {/* Wheel of Fortune */}
          <Card className="group overflow-hidden bg-card border-4 border-accent hover:border-primary hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl max-w-md mx-auto"
            onClick={() => navigate('/games/wheel-of-fortune')}>
            <div className="h-40 bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center relative">
              <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">COSMETIC!</div>
              <Target className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 text-foreground">🎯 Wheel of Fortune</h3>
              <p className="text-sm text-muted-foreground mb-4">Spin for exclusive neon name colors!</p>
              <Button variant="outline" size="sm" className="w-full">Spin the Wheel</Button>
            </div>
          </Card>

          {/* Diamond Earning Games */}
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-gold bg-clip-text text-transparent">💎 Earn Diamonds & Credits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'bull-mining', name: '🐂 Bull Mining Idle', desc: 'Bulls work together mining diamonds & credits!', gradient: 'from-emerald-600 to-green-700', icon: Pickaxe, btn: 'Start Mining' },
                { id: 'milk-the-bull', name: '🥛 Milk The Bull', desc: 'Click to milk! Build streaks for bonuses!', gradient: 'from-blue-600 to-cyan-700', icon: Gem, btn: 'Start Milking' },
                { id: 'bull-kingdom', name: '🏰 Bull Kingdom', desc: 'Build your empire & earn passive diamonds!', gradient: 'from-purple-600 to-pink-700', icon: Trophy, btn: 'Build Kingdom' },
                { id: 'diamond-mines', name: '⛏️ Diamond Mines', desc: 'Dig deep, unlock mines & auto-farm diamonds!', gradient: 'from-cyan-600 to-purple-700', icon: Pickaxe, btn: 'Start Mining' },
              ].map(game => (
                <Card key={game.id} className={`group overflow-hidden bg-card border-4 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl relative ${bullsOwned > 0 ? 'border-amber-400 animate-pulse-glow' : 'border-primary hover:border-accent'}`}
                  onClick={() => navigate(`/games/${game.id}`)}>
                  {bullsOwned > 0 && <div className="absolute top-2 left-2 bg-amber-500/90 text-black px-2 py-0.5 rounded-full text-xs font-bold z-10 animate-pulse">🐂 HOLDER BOOST</div>}
                  <div className={`h-40 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative`}>
                    <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold">NEW!</div>
                    <game.icon className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-foreground">{game.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{game.desc}</p>
                    <Button variant="outline" size="sm" className="w-full">{game.btn}</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Advanced Key-Only Games */}
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-gold bg-clip-text text-transparent text-center">🔑 Advanced Key-Only Games</h2>
            <p className="text-center text-muted-foreground mb-6">Exclusive games requiring keys. Higher stakes, bigger rewards!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "⚔️ Bull Gauntlet", desc: "Battle through waves!", icon: Trophy, gradient: "from-orange-600 to-red-700", route: "bull-gauntlet", btn: "Enter Arena" },
                { title: "💎 Diamond Fortress", desc: "Defend and collect!", icon: Gem, gradient: "from-cyan-600 to-blue-700", route: "diamond-fortress", btn: "Enter Fortress" },
                { title: "🏆 Treasure Vault", desc: "Unlock chests!", icon: Coins, gradient: "from-purple-600 to-pink-700", route: "treasure-vault", btn: "Enter Vault" },
                { title: "🚀 Cosmic Gauntlet", desc: "Navigate space!", icon: Trophy, gradient: "from-purple-600 to-blue-700", route: "cosmic-gauntlet", btn: "Launch Mission" },
                { title: "🎲 Fortune's Trial", desc: "Risk vs Reward!", icon: Coins, gradient: "from-amber-600 to-orange-700", route: "fortune-trial", btn: "Begin Trial" },
                { title: "🌑 Shadow Vault", desc: "Mystery boxes!", icon: Gem, gradient: "from-purple-600 to-indigo-700", route: "shadow-vault", btn: "Enter Shadows" },
                { title: "⚔️ Eternal Arena", desc: "Boss battles!", icon: Trophy, gradient: "from-red-600 to-orange-700", route: "eternal-arena", btn: "Enter Arena" },
                { title: "🔗 Lucky Chain", desc: "Build multipliers!", icon: Coins, gradient: "from-purple-600 to-pink-700", route: "lucky-chain", btn: "Start Chain" },
                { title: "🧠 Pattern Master", desc: "Test memory!", icon: Gem, gradient: "from-cyan-600 to-blue-700", route: "pattern-master", btn: "Test Memory" },
                { title: "⏱️ Perfect Timing", desc: "Hit the zone!", icon: Trophy, gradient: "from-orange-600 to-red-700", route: "perfect-timing", btn: "Test Timing" },
                { title: "🎵 Rhythm Rush", desc: "Hit beats!", icon: Music, gradient: "from-purple-600 to-pink-700", route: "rhythm-rush", btn: "Start Rhythm" },
                { title: "💎 Gem Chain", desc: "Match-3 puzzle!", icon: Gem, gradient: "from-emerald-600 to-green-700", route: "gem-chain", btn: "Match Gems" },
                { title: "🔐 Risk Vault", desc: "High-risk!", icon: Lock, gradient: "from-red-600 to-orange-700", route: "risk-vault", btn: "Take Risk" },
                { title: "⚡ Speed Run", desc: "Reflex arcade!", icon: Gauge, gradient: "from-yellow-600 to-amber-700", route: "speed-run", btn: "Start Run" },
              ].map(g => (
                <GameCard key={g.route} title={g.title} description={g.desc} icon={g.icon} gradient={g.gradient}
                  onClick={() => navigate(`/games/${g.route}`)} badge="🔑 KEY REQUIRED" badgeColor="bg-yellow-500 text-black"
                  buttonText={g.btn} buttonVariant="key" isHolder={bullsOwned > 0} />
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="max-w-2xl mx-auto space-y-4">
            <SubscriptionBox bullsOwned={bullsOwned} />
          </div>

          {/* Holder-Only Strategy Games */}
          <div>
            <h2 className="text-3xl font-bold mb-6 gradient-gold bg-clip-text text-transparent">👑 Holder-Only Strategy Games (Earn 🔑 Keys)</h2>
            {totalBulls === 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 rounded-xl border border-amber-500/40 flex items-center gap-3">
                <Lock className="w-6 h-6 text-amber-400" />
                <p className="text-amber-300 text-sm"><span className="font-bold">🔒 Hold a CSB Bull NFT or Subscribe to unlock!</span>{' '}
                  <a href="https://www.jpg.store/collection/cardanostakebulls?tab=items" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">Get yours on JPG.Store →</a>
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "⚔️ CSB Battle (1P)", desc: "Fight AI with your bulls, win $CsBv1!", icon: Swords, gradient: "from-fuchsia-600 to-rose-700", route: "csb/battle-arena?mode=ai", btn: "Battle AI", external: true },
                { title: "🎮 CSB Battle (PvP)", desc: "1v1 multiplayer · 3x $CsBv1 rewards!", icon: Users, gradient: "from-purple-700 to-cyan-700", route: "csb/battle-arena?mode=pvp", btn: "Find Match", external: true },
                { title: "⚔️ Bull Tactician", desc: "Chess-like strategy!", icon: Target, gradient: "from-indigo-600 to-purple-700", route: "bull-tactician", btn: "Play" },
                { title: "🏰 Kingdom Siege", desc: "Tower defense!", icon: Shield, gradient: "from-slate-600 to-gray-700", route: "kingdom-siege", btn: "Defend" },
                { title: "📈 Market Master", desc: "Trading sim!", icon: TrendingUp, gradient: "from-green-600 to-emerald-700", route: "market-master", btn: "Trade" },
                { title: "🪖 Bull Commander", desc: "Army management!", icon: Flame, gradient: "from-red-600 to-orange-700", route: "bull-commander", btn: "Command" },
                { title: "🏗️ Fortress Builder", desc: "Resource management!", icon: Pickaxe, gradient: "from-amber-600 to-yellow-700", route: "fortress-builder", btn: "Build" },
                { title: "🗺️ Cardano Conquest", desc: "Territory control!", icon: Globe, gradient: "from-blue-600 to-cyan-700", route: "cardano-conquest", btn: "Conquer" },
                { title: "🤝 Bull Diplomacy", desc: "Negotiation!", icon: Users, gradient: "from-violet-600 to-purple-700", route: "bull-diplomacy", btn: "Negotiate" },
                { title: "📦 Strategic Stacks", desc: "2048 puzzle!", icon: Gem, gradient: "from-pink-600 to-rose-700", route: "strategic-stacks", btn: "Stack" },
                { title: "🔨 Bull Blacksmith", desc: "Forge items!", icon: Flame, gradient: "from-orange-600 to-red-700", route: "bull-blacksmith", btn: "Forge" },
                { title: "📈 Bull Trader", desc: "Trade assets!", icon: TrendingUp, gradient: "from-cyan-600 to-blue-700", route: "bull-trader", btn: "Trade" },
                { title: "🛡️ Chain Defender", desc: "Tower defense!", icon: Shield, gradient: "from-blue-600 to-indigo-700", route: "chain-defender", btn: "Defend" },
                { title: "🌍 ADA Conquest", desc: "Conquer territories!", icon: Globe, gradient: "from-purple-600 to-pink-700", route: "ada-conquest", btn: "Conquer" },
                { title: "🏢 Bull Tycoon", desc: "Build empire!", icon: TrendingUp, gradient: "from-amber-600 to-orange-700", route: "bull-tycoon", btn: "Build Empire" },
                { title: "⚔️ Stake Wars", desc: "PvP battles!", icon: Flame, gradient: "from-red-600 to-rose-700", route: "stake-wars", btn: "Battle" },
                { title: "⚗️ Bull Alchemist", desc: "Combine elements!", icon: Sparkles, gradient: "from-emerald-600 to-teal-700", route: "bull-alchemist", btn: "Brew" },
                { title: "🏪 Crypto Merchant", desc: "Buy low sell high!", icon: Coins, gradient: "from-yellow-600 to-amber-700", route: "crypto-merchant", btn: "Trade" },
                { title: "⚔️ Bull Warlord", desc: "Conquer 7 zones!", icon: Target, gradient: "from-red-700 to-orange-800", route: "bull-warlord", btn: "Attack" },
                { title: "🏛️ Stake Architect", desc: "Build a city!", icon: Pickaxe, gradient: "from-blue-700 to-indigo-800", route: "stake-architect", btn: "Build" },
                { title: "🕵️ Bull Saboteur", desc: "Stealth missions!", icon: Shield, gradient: "from-gray-700 to-slate-800", route: "bull-saboteur", btn: "Infiltrate" },
                { title: "🏴‍☠️ Cardano Raider", desc: "Raid dungeons!", icon: Flame, gradient: "from-orange-700 to-red-800", route: "cardano-raider", btn: "Raid" },
                { title: "🔗 Bull Nexus", desc: "Connect nodes!", icon: Gem, gradient: "from-cyan-700 to-blue-800", route: "bull-nexus", btn: "Connect" },
                { title: "🔮 ADA Oracle", desc: "Gather prophecies!", icon: Sparkles, gradient: "from-purple-700 to-pink-800", route: "ada-oracle", btn: "Divine" },
                { title: "🧠 Bull Cipher", desc: "Decrypt 4-symbol vaults!", icon: Target, gradient: "from-indigo-700 to-blue-800", route: "bull-cipher", btn: "Decrypt" },
                { title: "✨ Rune Forge", desc: "Align starsign runes!", icon: Sparkles, gradient: "from-purple-700 to-indigo-800", route: "rune-forge", btn: "Forge" },
                { title: "🏛️ Council Strategy", desc: "Rule through 8 rounds!", icon: Users, gradient: "from-amber-700 to-orange-800", route: "council-strategy", btn: "Govern" },
                { title: "🛡️ Chain Citadel", desc: "Defend 5 sectors!", icon: Shield, gradient: "from-slate-700 to-indigo-800", route: "chain-citadel", btn: "Defend" },
                { title: "🌌 Zodiac Trials", desc: "Master all 12 signs!", icon: Globe, gradient: "from-blue-700 to-cyan-800", route: "zodiac-trials", btn: "Challenge" },
                { title: "🕵️ Bull Espionage", desc: "Stealth intel missions!", icon: Eye, gradient: "from-gray-700 to-zinc-800", route: "bull-espionage", btn: "Infiltrate" },
                { title: "🏗️ ADA Architect", desc: "Build the richest city!", icon: Building2, gradient: "from-teal-700 to-emerald-800", route: "ada-architect", btn: "Build" },
                { title: "⚔️ Bull Legion", desc: "Recruit & conquer!", icon: Swords, gradient: "from-red-700 to-rose-800", route: "bull-legion", btn: "Command" },
                { title: "🔓 Crypto Heist", desc: "Crack vault codes!", icon: Lock, gradient: "from-violet-700 to-purple-800", route: "crypto-heist", btn: "Heist" },
                { title: "🏛️ Bull Senate", desc: "Balance power!", icon: Users, gradient: "from-amber-700 to-yellow-800", route: "bull-senate", btn: "Govern" },
                { title: "👑 Stake Royale", desc: "Battle for the crown!", icon: Crown, gradient: "from-yellow-700 to-orange-800", route: "stake-royale", btn: "Fight" },
                { title: "⛵ Bull Odyssey", desc: "Sail 7 islands!", icon: Globe, gradient: "from-sky-700 to-blue-800", route: "bull-odyssey", btn: "Sail" },
                { title: "🔨 Bull Auction", desc: "Outbid the AI!", icon: Crown, gradient: "from-primary to-accent", route: "bull-auction", btn: "Bid" },
                { title: "🧙 Bull Arcanist", desc: "Elemental boss fights!", icon: Swords, gradient: "from-accent to-primary", route: "bull-arcanist", btn: "Cast" },
                { title: "🎯 Bounty Hunt", desc: "Track & capture!", icon: Eye, gradient: "from-secondary to-muted", route: "bull-bounty-hunt", btn: "Hunt" },
                { title: "⚗️ ADA Alchemy", desc: "Brew magic potions!", icon: Building2, gradient: "from-primary to-secondary", route: "ada-alchemy", btn: "Brew" },
                { title: "⚔️ Bull Gladiator", desc: "6 arena tiers!", icon: Swords, gradient: "from-destructive to-accent", route: "bull-gladiator", btn: "Fight" },
                { title: "📜 Bull Chronicle", desc: "Branching campaign strategy!", icon: Crown, gradient: "from-primary to-secondary", route: "bull-chronicle", btn: "Campaign" },
                { title: "🏛️ Stake Dynasty", desc: "Rule territory economics!", icon: Building2, gradient: "from-secondary to-accent", route: "stake-dynasty", btn: "Rule" },
                { title: "🔮 Rune Conclave", desc: "Master elite rune chains!", icon: Sparkles, gradient: "from-accent to-primary", route: "rune-conclave", btn: "Conclave" },
                { title: "👑 Bull Sovereign", desc: "Rule for 12 turns!", icon: Crown, gradient: "from-yellow-600 to-amber-800", route: "bull-sovereign", btn: "Rule" },
                { title: "🌍 ADA Empire", desc: "5-sector economy sim!", icon: Globe, gradient: "from-emerald-700 to-teal-800", route: "ada-empire", btn: "Build" },
                { title: "🔍 Bull Inquisitor", desc: "Solve 5 mystery cases!", icon: Eye, gradient: "from-slate-700 to-gray-800", route: "bull-inquisitor", btn: "Investigate" },
                { title: "⚔️ Bull Vanguard", desc: "Build army, defend waves!", icon: Shield, gradient: "from-red-700 to-orange-800", route: "bull-vanguard", btn: "Fight" },
                { title: "🏦 ADA Vault", desc: "Crack the vault layers!", icon: Lock, gradient: "from-cyan-700 to-blue-800", route: "ada-vault", btn: "Break In" },
                { title: "🎩 Bull Cartel", desc: "Territory empire builder!", icon: Building2, gradient: "from-gray-700 to-zinc-800", route: "bull-cartel", btn: "Expand" },
                { title: "🔮 Stake Oracle", desc: "Predict prophecies!", icon: Sparkles, gradient: "from-purple-700 to-indigo-800", route: "stake-oracle", btn: "Predict" },
                { title: "🧙 Bull Mystic", desc: "Dungeon spell combat!", icon: Flame, gradient: "from-violet-700 to-purple-800", route: "bull-mystic", btn: "Cast" },
                { title: "🧪 Chain Alchemist", desc: "Discover element combos!", icon: Sparkles, gradient: "from-lime-700 to-green-800", route: "chain-alchemist", btn: "Combine" },
                { title: "📊 Bull Prophet", desc: "Trade market positions!", icon: TrendingUp, gradient: "from-teal-700 to-emerald-800", route: "bull-prophet", btn: "Trade" },
                { title: "🏰 Crypto Siege", desc: "Fortress wave defense!", icon: Shield, gradient: "from-amber-700 to-orange-800", route: "crypto-siege", btn: "Defend" },
                { title: "🗺️ Bull Explorer", desc: "Risk-reward expeditions!", icon: Globe, gradient: "from-sky-700 to-blue-800", route: "bull-explorer", btn: "Explore" },
                { title: "👑 ADA Warden", desc: "Realm crisis management!", icon: Crown, gradient: "from-rose-700 to-red-800", route: "ada-warden", btn: "Rule" },
                { title: "🏴 Bull Conqueror", desc: "Conquer 6 territories!", icon: Globe, gradient: "from-red-800 to-orange-900", route: "bull-conqueror", btn: "Conquer" },
                { title: "🏗️ Stake Foundry", desc: "Build a city in 12 turns!", icon: Building2, gradient: "from-amber-800 to-yellow-900", route: "stake-foundry", btn: "Build" },
                { title: "⚗️ ADA Brewer", desc: "Gather & brew potions!", icon: Sparkles, gradient: "from-emerald-800 to-teal-900", route: "ada-brewer", btn: "Brew" },
                { title: "🏰 Bull Fortress", desc: "Tower defense waves!", icon: Shield, gradient: "from-slate-800 to-gray-900", route: "bull-fortress", btn: "Defend" },
                { title: "📊 Crypto Trader", desc: "Buy low, sell high!", icon: TrendingUp, gradient: "from-cyan-800 to-blue-900", route: "crypto-trader", btn: "Trade" },
              ].map(g => (
                <GameCard key={g.route} title={g.title} description={g.desc} icon={g.icon} gradient={g.gradient}
                  onClick={() => totalBulls > 0 ? navigate((g as any).external ? `/${g.route}` : `/games/${g.route}`) : toast({ title: "🔒 Holders Only", description: "Hold a CSB Bull NFT or Subscribe to unlock!", variant: "destructive" })}
                  badge={totalBulls > 0 ? ((g as any).external ? "🪙 $CsBv1" : "🔑 KEYS") : "🔒 LOCKED"} badgeColor={totalBulls > 0 ? ((g as any).external ? "bg-amber-500 text-black" : "bg-yellow-500 text-black") : "bg-gray-600 text-gray-300"}
                  buttonText={totalBulls > 0 ? g.btn : "🔒 Locked"} buttonVariant="key" isHolder={totalBulls > 0} />
              ))}
            </div>
          </div>

          {/* CSB Game Master */}
          <div className="mt-8">
            <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-card border-2 max-w-2xl mx-auto overflow-hidden relative border-amber-500/40">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 rounded-full bg-amber-500/20"><Sparkles className="w-8 h-8 text-amber-400" /></div>
                <div>
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">🤖 CSB Game Master</h3>
                  <p className="text-sm text-muted-foreground">Your AI assistant for tips, strategies & bonuses!</p>
                </div>
              </div>
              <CSBGameMaster bullsOwned={bullsOwned} rarityBonus={rarityBonus} context="Dashboard - browsing games" embedded={true} />
            </Card>
          </div>

          {/* Video Tutorial */}
          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="p-6 bg-card/90 backdrop-blur-sm border-2 border-primary/30">
              <h3 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-2 text-center">🎮 How to Play — Video Tutorial</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">Watch the full gameplay walkthrough from top to bottom</p>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted/50 border border-border">
                <video className="w-full h-full object-cover" controls preload="metadata">
                  <source src="/csb-gameplay-tutorial.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </Card>
          </div>

          {/* Per-Game Tutorial Guides */}
          <div className="mt-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-6 text-center">📖 Game Guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "🐂 Bull Mining", steps: ["Click 'Start Mining' to begin", "Bulls auto-mine diamonds over time", "Upgrade miners to boost output", "Collect diamonds before they cap out"] },
                { title: "🥛 Milk The Bull", steps: ["Click the bull rapidly to milk", "Build streaks for combo bonuses", "Higher streaks = more diamonds", "Don't miss — streaks reset!"] },
                { title: "🏰 Bull Kingdom", steps: ["Build refineries to process ore", "Ore auto-converts to diamonds", "Upgrade for faster production", "Collect diamonds from the refinery"] },
                { title: "🎯 Wheel of Fortune", steps: ["Costs 50 credits per spin", "Land on colors to unlock them", "Equip colors from 'My Colors'", "Neon colors glow on leaderboard!"] },
                { title: "🔑 Key Games", steps: ["Requires 1 Key to enter", "Higher risk, bigger diamond rewards", "Win keys from Holder games", "Swap 1M diamonds for 1 key"] },
                { title: "👑 Holder Games", steps: ["Need CSB Bull NFT or subscription", "Win to earn Keys 🔑", "Strategy-based, skill rewarded", "NFT holders get bonus multipliers"] },
                { title: "💎 Diamond Swap", steps: ["Trade 100 credits → 5 diamonds", "Diamonds show on leaderboard", "Climb ranks by earning more", "NFT bonuses boost all rewards"] },
                { title: "🏆 Bukals & Seasons", steps: ["Swap 1M credits → 1 Bukal trophy", "Season points auto-track diamond wins", "Top 10 shown on Season Panel", "Weekly seasons rotate automatically"] },
              ].map(guide => (
                <Card key={guide.title} className="p-4 bg-card/80 border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2">{guide.title}</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary font-bold">{i + 1}.</span>{step}</li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </div>

          {/* Community Links */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center gradient-gold bg-clip-text text-transparent">🐂 Cardano Stake Bulls Community 🐂</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {[
                { href: "https://arena2.cardanostakebulls.space/", icon: TrendingUp, title: "Stake Platform", desc: "Stake your ADA!", color: "primary" },
                { href: "https://www.jpg.store/collection/cardanostakebulls?tab=items", icon: Key, title: "Mint Bull Key 🔑", desc: "Get CSB Bulls!", color: "amber" },
                { href: "https://discord.gg/FCyYYwryYW", icon: Users, title: "Discord", desc: "Join our Discord!", color: "indigo" },
                { href: "https://x.com/worldofgaia5art?s=21&t=mSdrl7vSEhr5s0minUvc-w", icon: Globe, title: "Twitter / X", desc: "Follow us!", color: "blue" },
                { href: "https://csbpubliclibrary.lovable.app/", icon: ExternalLink, title: "Library", desc: "Read the public library", color: "cyan" },
                { href: "https://csbmerch.lovable.app/", icon: Sparkles, title: "Merchandise", desc: "Shop official merch", color: "primary" },
                { href: "https://cardanostakebulls.space", icon: ExternalLink, title: "Website", desc: "Learn more!", color: "cyan" },
              ].map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="p-4 bg-gradient-to-br from-primary/20 to-card border-2 border-primary/40 hover:border-primary hover:scale-105 transition-all duration-300 cursor-pointer h-full">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-primary/20"><link.icon className="w-6 h-6 text-primary" /></div>
                      <h3 className="font-bold text-foreground">{link.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                    <div className="flex items-center gap-1 text-primary text-xs mt-2"><span>Visit</span><ExternalLink className="w-3 h-3" /></div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
