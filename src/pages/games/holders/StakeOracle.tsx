import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PROPHECIES = [
  { text: '🌙 The market will rise at dawn', correct: 'bull', reward: 3 },
  { text: '🔥 A great fire burns the weak', correct: 'bear', reward: 4 },
  { text: '⚡ Lightning strikes the tallest tower', correct: 'bull', reward: 5 },
  { text: '🌊 The flood washes away the old', correct: 'bear', reward: 6 },
  { text: '🌟 Stars align for the chosen', correct: 'bull', reward: 8 },
  { text: '🪐 Saturn returns, debts are due', correct: 'bear', reward: 7 },
  { text: '🌈 After the storm, the rainbow', correct: 'bull', reward: 10 },
  { text: '💀 The reaper claims his toll', correct: 'bear', reward: 9 },
];

const StakeOracle = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Stake Oracle" });
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const prophecy = PROPHECIES[round % PROPHECIES.length];

  const predict = useCallback(async (choice: 'bull' | 'bear') => {
    if (gameOver) return;
    const bonusChance = totalBulls * 0.03;
    const isCorrect = choice === prophecy.correct || Math.random() < bonusChance;

    if (isCorrect) {
      const reward = prophecy.reward * (1 + streak);
      setScore(s => s + reward);
      setStreak(s => s + 1);
      setResult(`✅ Correct! +${reward} 🔑 (streak: ${streak + 1}x)`);
      if (round >= PROPHECIES.length - 1) {
        await awardKeys(score + reward);
        setResult(`👑 All prophecies fulfilled! Total: ${score + reward} 🔑`);
        setGameOver(true);
      } else {
        setRound(r => r + 1);
      }
    } else {
      setResult(`❌ Wrong! The oracle frowns. Earned: ${score} 🔑`);
      if (score > 0) await awardKeys(score);
      setGameOver(true);
    }
  }, [round, score, streak, prophecy, totalBulls, gameOver, awardKeys]);

  const reset = () => { setRound(0); setScore(0); setStreak(0); setResult(null); setGameOver(false); };

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Stake Oracle...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">🔮 Stake Oracle</h1>
        </div>
        <div className="flex gap-4 text-sm text-foreground justify-center">
          <span>Round: {round + 1}/{PROPHECIES.length}</span>
          <span>Score: {score}</span>
          <span>🔥 Streak: {streak}x</span>
        </div>
        <Card className="border-primary/30 text-center">
          <CardContent className="pt-6">
            <p className="text-lg text-foreground mb-4">{prophecy.text}</p>
            <p className="text-sm text-muted-foreground mb-4">What does this prophecy foretell?</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => predict('bull')} disabled={gameOver} className="bg-green-600 hover:bg-green-700 text-white">📈 Bull</Button>
              <Button onClick={() => predict('bear')} disabled={gameOver} className="bg-red-600 hover:bg-red-700 text-white">📉 Bear</Button>
            </div>
          </CardContent>
        </Card>
        {result && <p className="text-center text-sm text-foreground">{result}</p>}
        {gameOver && <Button onClick={reset} className="w-full bg-primary">🔄 Consult Again</Button>}
      </div>
    </div>
  );
};

export default StakeOracle;
