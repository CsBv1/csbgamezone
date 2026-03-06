import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Shield, Eye } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const SUSPECTS = ["The Merchant", "The Guard", "The Scholar", "The Priest", "The Farmer"];
const CLUES = [
  "Seen near the vault at midnight",
  "Has a key-shaped mark on their hand",
  "Recently acquired unusual wealth",
  "Was absent during the heist",
  "Has connections to the underground",
  "Owns a rare bull not on record",
  "Was overheard whispering about gold",
];

const BullInquisitor = () => {
  const navigate = useNavigate();
  const { diamonds, awardDiamonds, loading } = useGameLogic("Bull Inquisitor");
  const [caseNum, setCaseNum] = useState(1);
  const [cluesFound, setCluesFound] = useState<string[]>([]);
  const [suspect, setSuspect] = useState<string | null>(null);
  const [guilty, setGuilty] = useState(() => SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)]);
  const [investigations, setInvestigations] = useState(5);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<string[]>(["🔍 Case #1 opened. Investigate to find clues."]);
  const [gameOver, setGameOver] = useState(false);
  const [caseResult, setCaseResult] = useState<string | null>(null);

  const investigate = () => {
    if (investigations <= 0 || gameOver) return;
    const clue = CLUES[Math.floor(Math.random() * CLUES.length)];
    const suspectHint = Math.random() < 0.35 ? ` (points to ${guilty})` : ` (points to ${SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)]})`;
    setCluesFound(prev => [...prev, clue + suspectHint]);
    setInvestigations(prev => prev - 1);
    setLog(prev => [`🔎 Clue: ${clue}${suspectHint}`, ...prev].slice(0, 15));
  };

  const accuse = async (name: string) => {
    if (gameOver) return;
    const correct = name === guilty;
    const pts = correct ? 30 + investigations * 10 : 5;
    setScore(prev => prev + pts);
    setCaseResult(correct ? "✅ Correct!" : `❌ Wrong! It was ${guilty}`);
    setLog(prev => [correct ? `✅ Case #${caseNum}: ${name} was guilty! +${pts} pts` : `❌ Case #${caseNum}: Wrong! ${guilty} was guilty. +${pts} pts`, ...prev]);

    if (caseNum >= 5) {
      const finalScore = score + pts;
      const reward = Math.floor(finalScore / 4);
      setGameOver(true);
      if (reward > 0) await awardDiamonds(reward);
      setLog(prev => [`🏆 Investigation complete! ${finalScore} pts → ${reward} 💎`, ...prev]);
    }
  };

  const nextCase = () => {
    setCaseNum(prev => prev + 1);
    setCluesFound([]);
    setSuspect(null);
    setCaseResult(null);
    setGuilty(SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)]);
    setInvestigations(5);
    setLog(prev => [`🔍 Case #${caseNum + 1} opened.`, ...prev]);
  };

  const restart = () => {
    setCaseNum(1); setCluesFound([]); setSuspect(null); setScore(0); setGameOver(false);
    setCaseResult(null); setGuilty(SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)]);
    setInvestigations(5); setLog(["🔍 New investigation begins."]);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🔍 Bull Inquisitor</h1>
          <p className="text-muted-foreground">Solve 5 cases. Gather clues & accuse the guilty suspect.</p>
          <div className="flex gap-4 justify-center mt-3">
            <span className="font-bold text-accent">💎 {diamonds}</span>
            <span className="font-bold text-primary">Case {caseNum}/5</span>
            <span className="font-bold text-yellow-400">Score: {score}</span>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <img src={holyBull} alt="Inquisitor" className="w-24 h-24 object-cover rounded-full border-4 border-primary" />
        </div>

        {!gameOver && !caseResult && (
          <>
            <Card className="p-4 mb-4 bg-primary/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold flex items-center gap-2"><Search className="w-5 h-5" /> Investigations left: {investigations}</h3>
                <Button size="sm" onClick={investigate} disabled={investigations <= 0}>🔎 Investigate</Button>
              </div>
              {cluesFound.length > 0 && (
                <div className="space-y-1 mb-4">
                  {cluesFound.map((c, i) => <div key={i} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{c}</div>)}
                </div>
              )}
            </Card>
            <Card className="p-4 bg-accent/10">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Eye className="w-5 h-5" /> Accuse a Suspect</h3>
              <div className="grid grid-cols-5 gap-2">
                {SUSPECTS.map(s => (
                  <Button key={s} onClick={() => accuse(s)} variant="outline" className="text-xs h-auto py-3">{s}</Button>
                ))}
              </div>
            </Card>
          </>
        )}

        {caseResult && !gameOver && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">{caseResult}</h2>
            <Button onClick={nextCase}>Next Case →</Button>
          </div>
        )}

        {gameOver && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-accent mb-2">Investigation Complete!</h2>
            <p className="text-muted-foreground mb-4">Final Score: {score} → {Math.floor(score / 4)} 💎</p>
            <Button onClick={restart}>New Investigation</Button>
          </div>
        )}

        <Card className="p-4 bg-muted/30 max-h-40 overflow-y-auto mt-4">
          <h4 className="font-bold text-sm mb-2">📜 Case File</h4>
          {log.map((l, i) => <div key={i} className="text-xs text-muted-foreground">{l}</div>)}
        </Card>
      </Card>
    </div>
  );
};

export default BullInquisitor;
