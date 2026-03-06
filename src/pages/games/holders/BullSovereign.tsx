import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Shield, Swords } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const PROVINCES = ["Northern Plains", "Eastern Mines", "Southern Forests", "Western Shores", "Central Citadel"];
const POLICIES = ["Tax Heavy", "Military Focus", "Trade Routes", "Research Boost"];
const THREATS = ["Barbarian Raid", "Famine", "Plague", "Rival Kingdom", "Dragon Attack"];

const BullSovereign = () => {
  const navigate = useNavigate();
  const { diamonds, awardDiamonds, loading } = useGameLogic("Bull Sovereign");
  const [turn, setTurn] = useState(1);
  const [score, setScore] = useState(0);
  const [stability, setStability] = useState(100);
  const [treasury, setTreasury] = useState(500);
  const [army, setArmy] = useState(50);
  const [currentThreat, setCurrentThreat] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>(["👑 Your reign begins..."]);
  const [gameOver, setGameOver] = useState(false);

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 12));

  const applyPolicy = (policy: string) => {
    if (gameOver || loading) return;
    let stabDelta = 0, treasuryDelta = 0, armyDelta = 0, pts = 0;

    if (policy === "Tax Heavy") { treasuryDelta = 120; stabDelta = -15; pts = 8; }
    else if (policy === "Military Focus") { armyDelta = 20; treasuryDelta = -80; pts = 10; }
    else if (policy === "Trade Routes") { treasuryDelta = 60; stabDelta = 5; pts = 12; }
    else if (policy === "Research Boost") { stabDelta = 10; treasuryDelta = -40; armyDelta = 5; pts = 15; }

    setStability(prev => Math.min(100, Math.max(0, prev + stabDelta)));
    setTreasury(prev => Math.max(0, prev + treasuryDelta));
    setArmy(prev => Math.max(0, prev + armyDelta));
    setScore(prev => prev + pts);
    addLog(`📜 Enacted ${policy} (+${pts} pts)`);

    // Random threat
    if (Math.random() < 0.4) {
      const threat = THREATS[Math.floor(Math.random() * THREATS.length)];
      setCurrentThreat(threat);
      addLog(`⚠️ Threat: ${threat}!`);
    } else {
      setCurrentThreat(null);
    }

    if (turn >= 12) endGame(score + pts);
    else setTurn(prev => prev + 1);
  };

  const respondToThreat = (action: "fight" | "diplomacy" | "ignore") => {
    if (!currentThreat) return;
    let pts = 0;
    if (action === "fight") {
      if (army >= 30) { pts = 20; setArmy(prev => prev - 15); addLog(`⚔️ Defeated ${currentThreat}! (-15 army, +20 pts)`); }
      else { setStability(prev => Math.max(0, prev - 25)); addLog(`💀 Army too weak! Stability -25`); }
    } else if (action === "diplomacy") {
      pts = 10; setTreasury(prev => Math.max(0, prev - 50)); addLog(`🤝 Negotiated peace (-50 gold, +10 pts)`);
    } else {
      setStability(prev => Math.max(0, prev - 20)); addLog(`😬 Ignored ${currentThreat}! Stability -20`);
    }
    setScore(prev => prev + pts);
    setCurrentThreat(null);

    if (stability <= 0) endGame(score + pts);
  };

  const endGame = async (finalScore: number) => {
    setGameOver(true);
    const diamondReward = Math.floor(finalScore / 3);
    if (diamondReward > 0) await awardDiamonds(diamondReward);
    addLog(`🏆 Reign ended! ${diamondReward} 💎 earned from ${finalScore} pts`);
  };

  const restart = () => {
    setTurn(1); setScore(0); setStability(100); setTreasury(500); setArmy(50);
    setCurrentThreat(null); setGameOver(false); setLog(["👑 A new reign begins..."]);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">👑 Bull Sovereign</h1>
          <p className="text-muted-foreground">Rule your kingdom for 12 turns. Balance power, treasury & army.</p>
          <div className="flex gap-4 justify-center mt-3">
            <span className="font-bold text-accent">💎 {diamonds}</span>
            <span className="font-bold text-primary">Turn {turn}/12</span>
            <span className="font-bold text-yellow-400">Score: {score}</span>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <img src={holyBull} alt="Sovereign" className="w-24 h-24 object-cover rounded-full border-4 border-primary" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center bg-primary/10"><Shield className="w-6 h-6 mx-auto mb-1" /><div className="font-bold">{stability}%</div><div className="text-xs text-muted-foreground">Stability</div></Card>
          <Card className="p-4 text-center bg-accent/10"><Crown className="w-6 h-6 mx-auto mb-1" /><div className="font-bold">{treasury}</div><div className="text-xs text-muted-foreground">Treasury</div></Card>
          <Card className="p-4 text-center bg-destructive/10"><Swords className="w-6 h-6 mx-auto mb-1" /><div className="font-bold">{army}</div><div className="text-xs text-muted-foreground">Army</div></Card>
        </div>

        {currentThreat && !gameOver && (
          <Card className="p-4 mb-6 bg-destructive/20 border-destructive/40">
            <h3 className="font-bold mb-3">⚠️ Threat: {currentThreat}</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => respondToThreat("fight")}>⚔️ Fight</Button>
              <Button size="sm" variant="secondary" onClick={() => respondToThreat("diplomacy")}>🤝 Diplomacy</Button>
              <Button size="sm" variant="outline" onClick={() => respondToThreat("ignore")}>😬 Ignore</Button>
            </div>
          </Card>
        )}

        {!gameOver && !currentThreat && (
          <div className="mb-6">
            <h3 className="font-bold mb-3">Choose Policy for Turn {turn}</h3>
            <div className="grid grid-cols-2 gap-3">
              {POLICIES.map(p => (
                <Button key={p} onClick={() => applyPolicy(p)} variant="outline" className="h-auto py-3">
                  {p}
                </Button>
              ))}
            </div>
          </div>
        )}

        {gameOver && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-accent mb-2">Reign Over!</h2>
            <p className="text-muted-foreground mb-4">Final Score: {score} → {Math.floor(score / 3)} 💎</p>
            <Button onClick={restart}>New Reign</Button>
          </div>
        )}

        <Card className="p-4 bg-muted/30 max-h-40 overflow-y-auto">
          <h4 className="font-bold text-sm mb-2">📜 Chronicle</h4>
          {log.map((l, i) => <div key={i} className="text-xs text-muted-foreground">{l}</div>)}
        </Card>
      </Card>
    </div>
  );
};

export default BullSovereign;
