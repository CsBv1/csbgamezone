import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices, Flame, CreditCard, TrendingUp, CircleDollarSign, Spade, Target, Coins, ArrowUpDown, Pickaxe, TrendingDown, Grid3x3, PlayCircle, Award, Sparkles, Zap, BadgeDollarSign, Plane, Trophy, Gem, Castle, Milk } from "lucide-react";
import { CreditBar } from "@/components/CreditBar";

const Games = () => {
  const navigate = useNavigate();

  const featuredGames = [
    {
      id: "bull-mining",
      name: "🐂 Bull Mining Idle",
      icon: Pickaxe,
      description: "Bulls work together mining diamonds & credits!",
      color: "from-emerald-600 to-green-700",
      featured: true
    },
    {
      id: "milk-the-bull",
      name: "🥛 Milk The Bull",
      icon: Milk,
      description: "Click to milk! Build streaks for bonuses!",
      color: "from-blue-600 to-cyan-700",
      featured: true
    },
    {
      id: "bull-kingdom",
      name: "🏰 Bull Kingdom",
      icon: Castle,
      description: "Build your empire & earn passive rewards!",
      color: "from-purple-600 to-pink-700",
      featured: true
    },
  ];

  const games = [
    {
      id: "slots",
      name: "Bull Slots 🐂",
      icon: CircleDollarSign,
      description: "Spin the reels for jackpot rewards",
      color: "from-yellow-500 to-orange-500",
    },
    {
      id: "blackjack",
      name: "Blackjack 🐂",
      icon: Spade,
      description: "Beat the dealer to 21",
      color: "from-zinc-800 to-zinc-600",
    },
    {
      id: "roulette",
      name: "Roulette 🐂",
      icon: Target,
      description: "Spin the wheel of fortune",
      color: "from-red-600 to-rose-500",
    },
    {
      id: "plinko",
      name: "Plinko 🐂",
      icon: TrendingDown,
      description: "Drop and win multipliers",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "coin-flip",
      name: "Coin Flip 🐂",
      icon: Coins,
      description: "Heads or tails, double or nothing",
      color: "from-amber-500 to-yellow-600",
    },
    {
      id: "hi-lo",
      name: "Hi-Lo 🐂",
      icon: ArrowUpDown,
      description: "Guess higher or lower",
      color: "from-violet-500 to-purple-600",
    },
    {
      id: "mines",
      name: "Mines 🐂",
      icon: Pickaxe,
      description: "Find gems, avoid bombs",
      color: "from-emerald-500 to-green-600",
    },
    {
      id: "crash",
      name: "Crash 🐂",
      icon: TrendingUp,
      description: "Cash out before the crash",
      color: "from-orange-500 to-red-600",
    },
    {
      id: "keno",
      name: "Keno 🐂",
      icon: Grid3x3,
      description: "Pick numbers and win big",
      color: "from-pink-500 to-rose-600",
    },
    {
      id: "number-bet",
      name: "Number Bet 🐂",
      icon: Dices,
      description: "Bet on lucky numbers",
      color: "from-blue-500 to-purple-500",
    },
    {
      id: "card-flip",
      name: "Card Flip 🐂",
      icon: CreditCard,
      description: "Match the bulls and win",
      color: "from-green-500 to-teal-500",
    },
    {
      id: "bull-run",
      name: "Bull Run 🐂",
      icon: TrendingUp,
      description: "Race to the finish line",
      color: "from-red-500 to-pink-500",
    },
    {
      id: "dice-roll",
      name: "Dice Roll 🐂",
      icon: Flame,
      description: "Roll your way to victory",
      color: "from-purple-500 to-indigo-500",
    },
    {
      id: "baccarat",
      name: "Baccarat 🐂",
      icon: Spade,
      description: "Player, Banker, or Tie",
      color: "from-slate-700 to-slate-500",
    },
    {
      id: "wheel-of-fortune",
      name: "Wheel of Fortune 🐂",
      icon: Target,
      description: "Spin the mega wheel",
      color: "from-pink-600 to-purple-600",
    },
    {
      id: "scratch",
      name: "Scratch Card 🐂",
      icon: Award,
      description: "Scratch and match symbols",
      color: "from-amber-600 to-yellow-500",
    },
    {
      id: "limbo",
      name: "Limbo 🐂",
      icon: TrendingUp,
      description: "Set your target multiplier",
      color: "from-cyan-600 to-blue-700",
    },
    {
      id: "video-poker",
      name: "Video Poker 🐂",
      icon: PlayCircle,
      description: "Hold and draw to win",
      color: "from-indigo-600 to-purple-700",
    },
    {
      id: "sic-bo",
      name: "Sic Bo 🐂",
      icon: Dices,
      description: "Three dice betting",
      color: "from-rose-600 to-red-700",
    },
    {
      id: "dragon-tiger",
      name: "Dragon Tiger 🐂",
      icon: Zap,
      description: "Fast-paced card showdown",
      color: "from-orange-600 to-red-600",
    },
    {
      id: "aviator",
      name: "Aviator 🐂",
      icon: Plane,
      description: "Cash out before crash",
      color: "from-sky-500 to-blue-600",
    },
    {
      id: "texas-holdem",
      name: "Texas Hold'em 🐂",
      icon: Sparkles,
      description: "Classic poker showdown",
      color: "from-green-700 to-emerald-600",
    },
    {
      id: "three-card-poker",
      name: "3-Card Poker 🐂",
      icon: BadgeDollarSign,
      description: "Quick poker action",
      color: "from-teal-600 to-cyan-600",
    },
    {
      id: "war",
      name: "War 🐂",
      icon: Target,
      description: "Highest card wins",
      color: "from-red-700 to-orange-700",
    },
    {
      id: "caribbean-stud",
      name: "Caribbean Stud 🐂",
      icon: Spade,
      description: "Beat the dealer's hand",
      color: "from-blue-700 to-cyan-700",
    },
    {
      id: "pai-gow",
      name: "Pai Gow 🐂",
      icon: Dices,
      description: "Ancient Chinese game",
      color: "from-amber-700 to-orange-700",
    },
    {
      id: "red-dog",
      name: "Red Dog 🐂",
      icon: CreditCard,
      description: "In-between card game",
      color: "from-red-800 to-pink-700",
    },
    {
      id: "teen-patti",
      name: "Teen Patti 🐂",
      icon: Sparkles,
      description: "Indian poker classic",
      color: "from-purple-700 to-pink-700",
    },
    {
      id: "andar-bahar",
      name: "Andar Bahar 🐂",
      icon: Coins,
      description: "Pick your side",
      color: "from-green-800 to-teal-700",
    },
    {
      id: "fan-tan",
      name: "Fan Tan 🐂",
      icon: Grid3x3,
      description: "Count the beads",
      color: "from-yellow-700 to-amber-700",
    },
    {
      id: "chuck-a-luck",
      name: "Chuck-a-Luck 🐂",
      icon: Dices,
      description: "Three dice betting",
      color: "from-indigo-700 to-purple-700",
    },
    {
      id: "money-wheel",
      name: "Money Wheel 🐂",
      icon: CircleDollarSign,
      description: "Spin for multipliers",
      color: "from-green-600 to-emerald-700",
    },
    {
      id: "bonus-bowling",
      name: "Bonus Bowling 🐂",
      icon: Target,
      description: "Strike for wins",
      color: "from-blue-800 to-indigo-700",
    },
    {
      id: "prize-drop",
      name: "Prize Drop 🐂",
      icon: Award,
      description: "Catch falling prizes",
      color: "from-pink-700 to-rose-700",
    },
    {
      id: "tower",
      name: "Tower 🐂",
      icon: TrendingUp,
      description: "Climb to win",
      color: "from-slate-700 to-zinc-700",
    },
    {
      id: "fish-prawn-crab",
      name: "Fish Prawn Crab 🐂",
      icon: Dices,
      description: "Asian dice game",
      color: "from-cyan-700 to-blue-800",
    },
    {
      id: "let-it-ride",
      name: "Let It Ride 🐂",
      icon: Spade,
      description: "Build your hand",
      color: "from-emerald-700 to-green-800",
    },
    {
      id: "big-six",
      name: "Big Six Wheel 🐂",
      icon: Target,
      description: "Big money wheel",
      color: "from-orange-700 to-red-700",
    },
    { id: "space-race", name: "Space Race 🐂", icon: Plane, description: "Race to the stars", color: "from-purple-600 to-indigo-700" },
    { id: "golden-egg", name: "Golden Egg 🐂", icon: Award, description: "Find the golden egg", color: "from-yellow-600 to-amber-700" },
    { id: "lucky-ladder", name: "Lucky Ladder 🐂", icon: TrendingUp, description: "Climb to the top", color: "from-green-600 to-teal-700" },
    { id: "ball-drop", name: "Ball Drop 🐂", icon: CircleDollarSign, description: "Watch it drop", color: "from-blue-600 to-cyan-700" },
    { id: "color-match", name: "Color Match 🐂", icon: Sparkles, description: "Match the color", color: "from-pink-600 to-purple-700" },
    { id: "treasure-hunt", name: "Treasure Hunt 🐂", icon: Award, description: "Find treasures", color: "from-amber-700 to-yellow-800" },
    { id: "lucky-numbers", name: "Lucky Numbers 🐂", icon: Grid3x3, description: "Pick 6 numbers", color: "from-indigo-600 to-blue-700" },
    { id: "wild-west", name: "Wild West 🐂", icon: Target, description: "Western fortunes", color: "from-orange-600 to-red-700" },
    { id: "pirate-booty", name: "Pirate Booty 🐂", icon: Coins, description: "Open treasure chests", color: "from-cyan-700 to-blue-800" },
    { id: "diamond-dash", name: "Diamond Dash 🐂", icon: Sparkles, description: "Collect diamonds", color: "from-purple-700 to-pink-700" },
    { id: "mystic-orbs", name: "Mystic Orbs 🐂", icon: CircleDollarSign, description: "Match orbs", color: "from-violet-600 to-purple-700" },
    { id: "jungle-jump", name: "Jungle Jump 🐂", icon: TrendingUp, description: "Jump through jungle", color: "from-green-700 to-emerald-800" },
    { id: "cosmic-crash", name: "Cosmic Crash 🐂", icon: Plane, description: "Cash before crash", color: "from-indigo-700 to-purple-800" },
    { id: "magic-match", name: "Magic Match 🐂", icon: Sparkles, description: "Match all pairs", color: "from-pink-700 to-rose-800" },
    { id: "rocket-rush", name: "Rocket Rush 🐂", icon: Plane, description: "Launch and eject", color: "from-red-700 to-orange-800" },
    { id: "alien-invasion", name: "Alien Invasion 🐂", icon: Target, description: "Shoot aliens", color: "from-green-800 to-lime-700" },
    { id: "candy-crush", name: "Candy Crush 🐂", icon: Award, description: "Match candies", color: "from-pink-600 to-fuchsia-700" },
    { id: "bull-race", name: "Bull Race 🐂", icon: TrendingUp, description: "Race your bull", color: "from-red-600 to-orange-700" },
    { id: "high-low", name: "High Low 🐂", icon: ArrowUpDown, description: "Higher or lower", color: "from-blue-700 to-cyan-700" },
    { id: "triple-chance", name: "Triple Chance 🐂", icon: Sparkles, description: "Match 3 symbols", color: "from-purple-600 to-pink-700" },
    { id: "bulls-eye", name: "Bulls Eye 🐂", icon: Target, description: "Hit the target", color: "from-green-700 to-teal-700" },
    { id: "seven-up", name: "Seven Up 🐂", icon: Dices, description: "Under, seven, over", color: "from-amber-700 to-orange-700" },
    { id: "gold-rush", name: "Gold Rush 🐂", icon: Coins, description: "Dig for gold", color: "from-yellow-700 to-amber-800" },
    { id: "lucky-wheel", name: "Lucky Wheel 🐂", icon: CircleDollarSign, description: "Spin for prizes", color: "from-indigo-700 to-purple-700" },
    { id: "number-guess", name: "Number Guess 🐂", icon: Grid3x3, description: "Guess 1-100", color: "from-pink-700 to-rose-700" },
    { id: "quick-draw", name: "Quick Draw 🐂", icon: Target, description: "Pick 5, match wins", color: "from-cyan-700 to-blue-800" },
    { id: "bonanza-balls", name: "Bonanza Balls 🐂", icon: CircleDollarSign, description: "Match color balls", color: "from-violet-700 to-purple-800" },
    { id: "instant-win", name: "Instant Win 🐂", icon: Zap, description: "One click wins", color: "from-orange-700 to-red-800" },
    { id: "hot-shot", name: "Hot Shot 🐂", icon: Flame, description: "Heat and cool", color: "from-red-700 to-orange-800" },
    { id: "crazy-eights", name: "Crazy Eights 🐂", icon: Dices, description: "Collect eights", color: "from-emerald-700 to-green-800" },
    { id: "mega-match", name: "Mega Match 🐂", icon: Sparkles, description: "Match 5 symbols", color: "from-pink-700 to-fuchsia-800" },
    { id: "rapid-roll", name: "Rapid Roll 🐂", icon: Dices, description: "Roll 5 dice", color: "from-blue-700 to-indigo-800" },
    { id: "power-pick", name: "Power Pick 🐂", icon: Award, description: "Pick 3 boxes", color: "from-yellow-700 to-orange-800" },
    { id: "blitz-bet", name: "Blitz Bet 🐂", icon: Zap, description: "Fast odd/even", color: "from-purple-700 to-pink-800" },
    { id: "snap-jackpot", name: "Snap Jackpot 🐂", icon: CircleDollarSign, description: "Quick jackpot", color: "from-amber-700 to-yellow-800" },
    { id: "cash-cascade", name: "Cash Cascade 🐂", icon: TrendingUp, description: "Multiply wins", color: "from-green-700 to-emerald-800" },
    { id: "fortune-flip", name: "Fortune Flip 🐂", icon: Coins, description: "Flip for bulls", color: "from-cyan-700 to-teal-800" },
    { id: "bulls-paradise", name: "Bulls Paradise 🐂", icon: TrendingUp, description: "Enter paradise", color: "from-green-600 to-emerald-600" },
    { id: "bulls-fortune", name: "Bulls Fortune 🐂", icon: Gem, description: "Find your fortune", color: "from-cyan-600 to-blue-600" },
    { id: "mega-bull", name: "Mega Bull 🐂", icon: Zap, description: "Mega multipliers", color: "from-yellow-600 to-orange-600" },
    { id: "bull-challenge", name: "Bull Challenge 🐂", icon: Trophy, description: "Challenge levels", color: "from-red-600 to-pink-600" },
    { id: "bull-jackpot", name: "Bull Jackpot 🐂", icon: CircleDollarSign, description: "Progressive jackpot", color: "from-yellow-700 to-amber-700" },
    { id: "bull-arena", name: "Bull Arena 🐂", icon: Target, description: "Battle arena", color: "from-red-700 to-orange-700" },
    { id: "bull-quest", name: "Bull Quest 🐂", icon: Award, description: "Epic quests", color: "from-green-700 to-teal-700" },
    { id: "bull-frenzy", name: "Bull Frenzy 🐂", icon: Flame, description: "Frenzy mode", color: "from-orange-700 to-red-700" },
    { id: "bull-mystery", name: "Bull Mystery 🐂", icon: Sparkles, description: "Uncover mysteries", color: "from-purple-700 to-pink-700" },
    { id: "bull-power", name: "Bull Power 🐂", icon: Zap, description: "Power levels", color: "from-yellow-700 to-orange-800" },
    { id: "bull-riches", name: "Bull Riches 🐂", icon: Coins, description: "Strike it rich", color: "from-green-800 to-emerald-800" },
    { id: "bull-legend", name: "Bull Legend 🐂", icon: Trophy, description: "Become legend", color: "from-yellow-800 to-amber-800" },
    { id: "bull-strike", name: "Bull Strike 🐂", icon: Target, description: "Perfect strikes", color: "from-red-800 to-pink-800" },
    { id: "bull-victory", name: "Bull Victory 🐂", icon: Award, description: "Victory streaks", color: "from-cyan-800 to-blue-800" },
    { id: "bull-bonanza", name: "Bull Bonanza 🐂", icon: Sparkles, description: "Bonanza wins", color: "from-pink-800 to-purple-800" },
    { id: "bull-mania", name: "Bull Mania 🐂", icon: Flame, description: "Total mania", color: "from-blue-800 to-indigo-800" },
    { id: "bull-royale", name: "Bull Royale 🐂", icon: Target, description: "Battle royale", color: "from-purple-800 to-pink-800" },
    { id: "bull-champion", name: "Bull Champion 🐂", icon: Trophy, description: "Championship", color: "from-yellow-800 to-orange-900" },
    { id: "bull-empire", name: "Bull Empire 🐂", icon: CircleDollarSign, description: "Build empire", color: "from-slate-800 to-zinc-800" },
    { id: "bull-destiny", name: "Bull Destiny 🐂", icon: Sparkles, description: "Find destiny", color: "from-indigo-800 to-purple-900" },
  ];

  return (
    <div className="min-h-screen bull-pattern">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <CreditBar />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
              🎰 Free Casino Game Zone 🎮
            </h1>
            <p className="text-lg text-muted-foreground">
              100+ Classic Casino Games • Free to Play • No Wallet Required
            </p>
          </div>
        </div>
      </header>

      {/* Games Grid */}
      <main className="container mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="mb-12 text-center">
          <Card className="inline-block p-8 bg-gradient-to-r from-primary/20 to-card border-2 border-primary/40">
            <h2 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent mb-4">
              Want to Earn Diamonds & Credits? 💎
            </h2>
            <p className="text-muted-foreground mb-6">Check out our exclusive earning games on the dashboard!</p>
            <Button 
              size="lg" 
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Go to Dashboard →
            </Button>
          </Card>
        </div>

        {/* Casino Games Grid */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent mb-6 text-center">
            🎰 All Casino Games
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Card
                key={game.id}
                className="group overflow-hidden bg-card border-2 border-primary/30 hover:border-primary hover:scale-105 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/games/${game.id}`)}
              >
                <div className={`h-32 bg-gradient-to-br ${game.color} flex items-center justify-center`}>
                  <Icon className="w-16 h-16 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 text-foreground">{game.name}</h3>
                  <p className="text-muted-foreground mb-4">{game.description}</p>
                  <Button variant="outline" className="w-full">
                    Enter Game
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* All Games Available */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-8 bg-gradient-to-r from-primary/20 to-card border-2 border-primary/40">
            <p className="text-3xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🎮 120+ Games Available! 🐂</p>
            <p className="text-muted-foreground text-lg">Play, Win Diamonds & Climb the Leaderboard!</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Games;
