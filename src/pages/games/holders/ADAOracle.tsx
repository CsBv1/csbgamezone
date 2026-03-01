import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";

export default function ADAOracle() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "ADA Oracle" });
  const [wisdom, setWisdom] = useState(0);
  const [mana, setMana] = useState(100);
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [keysEarned, setKeysEarned] = useState(0);
  const [prophecy, setProphecy] = useState('');

  const prophecies = [
    { text: '🌟 The stars align in your favor', wisdom: 25, mana: 20 },
    { text: '🌙 The moon reveals hidden truths', wisdom: 15, mana: 10 },
    { text: '☀️ Solar power surges through you', wisdom: 30, mana: 30 },
    { text: '🌊 Ocean whispers ancient secrets', wisdom: 20, mana: 15 },
    { text: '⚡ Thunder cracks with power', wisdom: 35, mana: 35 },
    { text: '🍃 Wind carries lost knowledge', wisdom: 10, mana: 5 },
  ];

  const divine = () => {
    const p = prophecies[Math.floor(Math.random() * prophecies.length)];
    const bullBonus = bullsOwned * 3;
    
    if (mana < p.mana) {
      setProphecy('💫 Not enough mana...');
      return;
    }
    
    setMana(m => m - p.mana);
    setWisdom(w => w + p.wisdom + bullBonus);
    setProphecy(p.text);

    if (wisdom + p.wisdom + bullBonus >= 200) {
      setGameState('won');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      awardKeys(keys);
    } else if (round >= 12) {
      setGameState('lost');
    } else {
      setRound(r => r + 1);
    }
  };

  const meditate = () => { setMana(m => Math.min(100, m + 30)); setRound(r => r + 1); setProphecy('🧘 Mana restored...'); };
  const resetGame = () => { setWisdom(0); setMana(100); setRound(1); setGameState('playing'); setKeysEarned(0); setProphecy(''); };

  if (isLoading) return <div className="min-h-screen bull-pattern flex items-center justify-center"><div className="text-2xl text-primary animate-pulse">Loading...</div></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
        <CreditBar />
      </div>
      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🔮 ADA Oracle</h1>
          <p className="text-muted-foreground">Gather 200 wisdom through prophecies!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 3} wisdom bonus</div>
        </div>
        {gameState !== 'playing' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{gameState === 'won' ? '🔮' : '😵'}</div>
            <h2 className="text-2xl font-bold mb-2">{gameState === 'won' ? 'All-Seeing Oracle!' : 'Vision Faded!'}</h2>
            {keysEarned > 0 && <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑</p>}
            <Button onClick={resetGame} size="lg">Play Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>📖 Wisdom: {wisdom}/200</span>
              <span>🔮 Mana: {mana}</span>
              <span>🌀 Round: {round}/12</span>
            </div>
            {prophecy && <p className="text-center mb-4 text-lg p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">{prophecy}</p>}
            <div className="flex gap-2">
              <Button onClick={divine} className="flex-1">🔮 Divine</Button>
              <Button onClick={meditate} variant="outline" className="flex-1">🧘 Meditate (+30 mana)</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
