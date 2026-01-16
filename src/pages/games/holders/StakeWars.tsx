import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords, Trophy, Users, Zap, Shield, Target } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

audioManager.startBackgroundMusic();

interface Opponent {
  id: number;
  name: string;
  emoji: string;
  power: number;
  reward: number;
  defeated: boolean;
}

const OPPONENTS: Opponent[] = [
  { id: 1, name: 'Rookie Bull', emoji: '🐂', power: 30, reward: 50, defeated: false },
  { id: 2, name: 'Wild Stallion', emoji: '🐎', power: 50, reward: 100, defeated: false },
  { id: 3, name: 'Golden Bear', emoji: '🐻', power: 70, reward: 200, defeated: false },
  { id: 4, name: 'Crypto Wolf', emoji: '🐺', power: 90, reward: 400, defeated: false },
  { id: 5, name: 'Diamond Dragon', emoji: '🐉', power: 120, reward: 800, defeated: false },
];

const BOOSTS = [
  { id: 'power', name: 'Power Up', emoji: '⚡', cost: 100, effect: '+20 Power' },
  { id: 'defense', name: 'Shield', emoji: '🛡️', cost: 75, effect: '+15% Defense' },
  { id: 'critical', name: 'Critical', emoji: '🎯', cost: 150, effect: '+30% Crit Chance' },
];

export default function StakeWars() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Stake Wars" 
  });
  
  const [gold, setGold] = useState(200);
  const [power, setPower] = useState(50);
  const [defense, setDefense] = useState(0);
  const [critChance, setCritChance] = useState(10);
  const [opponents, setOpponents] = useState<Opponent[]>(OPPONENTS);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [totalWins, setTotalWins] = useState(0);

  // Award keys on win
  useEffect(() => {
    const doAward = async () => {
      if (gameOver && won) {
        const keys = 3 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        await awardKeys(keys);
        audioManager.playSFX('jackpot');
      }
    };
    doAward();
  }, [gameOver, won]);

  const buyBoost = (boostId: string) => {
    const boost = BOOSTS.find(b => b.id === boostId);
    if (!boost || gold < boost.cost) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('collect');
    setGold(g => g - boost.cost);
    
    switch (boostId) {
      case 'power':
        setPower(p => p + 20);
        break;
      case 'defense':
        setDefense(d => d + 15);
        break;
      case 'critical':
        setCritChance(c => Math.min(c + 30, 80));
        break;
    }
  };

  const startBattle = async (opponent: Opponent) => {
    if (isBattling || opponent.defeated) return;
    
    audioManager.playSFX('attack');
    setSelectedOpponent(opponent);
    setIsBattling(true);
    setBattleResult(null);
    
    // Simulate battle with some delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Calculate battle outcome
    const isCrit = Math.random() * 100 < critChance;
    const effectivePower = isCrit ? power * 1.5 : power;
    const defenseReduction = opponent.power * (defense / 100);
    const finalDamage = opponent.power - defenseReduction;
    
    const winChance = (effectivePower / (effectivePower + finalDamage)) * 100;
    const roll = Math.random() * 100;
    
    if (roll < winChance) {
      // Win
      audioManager.playSFX('jackpot');
      setBattleResult('win');
      setGold(g => g + opponent.reward);
      setTotalWins(w => w + 1);
      setOpponents(ops => ops.map(o => 
        o.id === opponent.id ? { ...o, defeated: true } : o
      ));
      
      // Check if all defeated
      const allDefeated = opponents.filter(o => o.id !== opponent.id).every(o => o.defeated);
      if (allDefeated) {
        setWon(true);
        setGameOver(true);
      }
    } else {
      // Lose
      audioManager.playSFX('lose');
      setBattleResult('lose');
      setGold(g => Math.max(0, g - 50));
      
      if (gold <= 50) {
        setGameOver(true);
      }
    }
    
    setIsBattling(false);
  };

  const resetGame = () => {
    setGold(200);
    setPower(50);
    setDefense(0);
    setCritChance(10);
    setOpponents(OPPONENTS.map(o => ({ ...o, defeated: false })));
    setSelectedOpponent(null);
    setBattleResult(null);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
    setTotalWins(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Swords className="w-8 h-8 text-red-500" />
            Stake Wars
          </h1>
          <p className="text-muted-foreground">Defeat all opponents to claim victory!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{Math.floor(bullsOwned / 2)} bonus keys</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{won ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Champion!' : 'Defeated!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              Victories: {totalWins}/{OPPONENTS.length}
            </p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Fight Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="text-center p-2 bg-yellow-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Gold</p>
                <p className="font-bold text-yellow-400">{gold}g</p>
              </div>
              <div className="text-center p-2 bg-red-500/20 rounded-lg">
                <Zap className="w-4 h-4 mx-auto text-red-400" />
                <p className="font-bold text-red-400">{power}</p>
              </div>
              <div className="text-center p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-4 h-4 mx-auto text-blue-400" />
                <p className="font-bold text-blue-400">{defense}%</p>
              </div>
              <div className="text-center p-2 bg-purple-500/20 rounded-lg">
                <Target className="w-4 h-4 mx-auto text-purple-400" />
                <p className="font-bold text-purple-400">{critChance}%</p>
              </div>
            </div>

            {/* Boosts Shop */}
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Power-Ups
              </h3>
              <div className="flex gap-2">
                {BOOSTS.map(boost => (
                  <Button
                    key={boost.id}
                    size="sm"
                    variant="outline"
                    onClick={() => buyBoost(boost.id)}
                    disabled={gold < boost.cost}
                    className="flex-1"
                  >
                    {boost.emoji} {boost.cost}g
                  </Button>
                ))}
              </div>
            </div>

            {/* Battle Result */}
            {battleResult && selectedOpponent && (
              <div className={`mb-4 p-4 rounded-lg text-center ${
                battleResult === 'win' 
                  ? 'bg-green-500/20 border border-green-500/40' 
                  : 'bg-red-500/20 border border-red-500/40'
              }`}>
                <div className="text-2xl mb-2">
                  {battleResult === 'win' ? '⚔️ Victory!' : '💀 Defeated!'}
                </div>
                <p className="text-sm">
                  {battleResult === 'win' 
                    ? `You defeated ${selectedOpponent.name} and won ${selectedOpponent.reward}g!`
                    : `${selectedOpponent.name} was too strong! Lost 50g.`
                  }
                </p>
              </div>
            )}

            {/* Opponents */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> Opponents ({totalWins}/{OPPONENTS.length} defeated)
              </h3>
              {opponents.map(opponent => (
                <div 
                  key={opponent.id} 
                  className={`p-4 rounded-lg flex items-center gap-4 transition-all ${
                    opponent.defeated 
                      ? 'bg-green-500/10 border border-green-500/30 opacity-60' 
                      : 'bg-muted/20 hover:bg-muted/30 cursor-pointer'
                  }`}
                  onClick={() => !opponent.defeated && !isBattling && startBattle(opponent)}
                >
                  <div className="text-3xl">{opponent.emoji}</div>
                  <div className="flex-1">
                    <h4 className="font-bold flex items-center gap-2">
                      {opponent.name}
                      {opponent.defeated && <span className="text-xs text-green-400">✓ Defeated</span>}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Power: {opponent.power} | Reward: {opponent.reward}g
                    </p>
                  </div>
                  {!opponent.defeated && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      disabled={isBattling}
                    >
                      {isBattling && selectedOpponent?.id === opponent.id ? (
                        <span className="animate-pulse">Fighting...</span>
                      ) : (
                        '⚔️ Battle'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
