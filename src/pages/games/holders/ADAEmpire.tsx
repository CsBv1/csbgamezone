import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, TrendingUp, Gem } from "lucide-react";
import { useGameLogic } from "@/hooks/useGameLogic";
import holyBull from "@/assets/holy-bull.jpeg";

const SECTORS = ["Mining", "Agriculture", "Technology", "Military", "Commerce"];
const EVENTS = [
  { name: "Gold Rush", effect: "Mining +50%" },
  { name: "Drought", effect: "Agriculture -30%" },
  { name: "Innovation Boom", effect: "Technology +40%" },
  { name: "Peace Treaty", effect: "Military savings +20%" },
  { name: "Trade Festival", effect: "Commerce +60%" },
  { name: "Earthquake", effect: "All -10%" },
  { name: "Bull Run", effect: "All +25%" },
];

const ADAEmpire = () => {
  const navigate = useNavigate();
  const { diamonds, awardDiamonds, loading } = useGameLogic("ADA Empire");
  const [round, setRound] = useState(1);
  const maxRounds = 10;
  const [investments, setInvestments] = useState<Record<string, number>>({ Mining: 1, Agriculture: 1, Technology: 0, Military: 0, Commerce: 1 });
  const [wealth, setWealth] = useState(0);
  const [eventLog, setEventLog] = useState<string[]>(["🌍 Empire founded. Invest wisely."]);
  const [gameOver, setGameOver] = useState(false);
  const [investPoints, setInvestPoints] = useState(3);

  const invest = (sector: string) => {
    if (investPoints <= 0 || gameOver) return;
    setInvestments(prev => ({ ...prev, [sector]: prev[sector] + 1 }));
    setInvestPoints(prev => prev - 1);
  };

  const endTurn = async () => {
    if (gameOver) return;
    // Random event
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    let turnWealth = 0;

    for (const sector of SECTORS) {
      let base = investments[sector] * 5;
      if (event.effect.includes(sector) && event.effect.includes("+")) base = Math.floor(base * 1.5);
      if (event.effect.includes(sector) && event.effect.includes("-")) base = Math.floor(base * 0.6);
      if (event.effect.includes("All") && event.effect.includes("+")) base = Math.floor(base * 1.25);
      if (event.effect.includes("All") && event.effect.includes("-")) base = Math.floor(base * 0.9);
      turnWealth += base;
    }

    setWealth(prev => prev + turnWealth);
    setEventLog(prev => [`R${round}: ${event.name} (${event.effect}) → +${turnWealth} wealth`, ...prev].slice(0, 15));

    if (round >= maxRounds) {
      const totalWealth = wealth + turnWealth;
      const reward = Math.floor(totalWealth / 5);
      setGameOver(true);
      if (reward > 0) await awardDiamonds(reward);
      setEventLog(prev => [`🏆 Empire complete! ${totalWealth} wealth → ${reward} 💎`, ...prev]);
    } else {
      setRound(prev => prev + 1);
      setInvestPoints(2);
    }
  };

  const restart = () => {
    setRound(1); setWealth(0); setGameOver(false); setInvestPoints(3);
    setInvestments({ Mining: 1, Agriculture: 1, Technology: 0, Military: 0, Commerce: 1 });
    setEventLog(["🌍 New empire founded."]);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-4"><ArrowLeft className="w-5 h-5" /> Back</Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">🌍 ADA Empire</h1>
          <p className="text-muted-foreground">Build a 5-sector empire over {maxRounds} rounds. React to world events.</p>
          <div className="flex gap-4 justify-center mt-3">
            <span className="font-bold text-accent">💎 {diamonds}</span>
            <span className="font-bold text-primary">Round {round}/{maxRounds}</span>
            <span className="font-bold text-yellow-400">Wealth: {wealth}</span>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <img src={holyBull} alt="Empire" className="w-24 h-24 object-cover rounded-full border-4 border-primary" />
        </div>

        {!gameOver && (
          <>
            <Card className="p-4 mb-4 bg-primary/10">
              <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Invest ({investPoints} points left)</h3>
              <div className="grid grid-cols-5 gap-2">
                {SECTORS.map(s => (
                  <Button key={s} onClick={() => invest(s)} disabled={investPoints <= 0} variant="outline" className="flex flex-col h-auto py-3">
                    <span className="text-lg mb-1">{s === "Mining" ? "⛏️" : s === "Agriculture" ? "🌾" : s === "Technology" ? "🔬" : s === "Military" ? "⚔️" : "🏪"}</span>
                    <span className="text-xs">{s}</span>
                    <span className="text-xs font-bold">Lv {investments[s]}</span>
                  </Button>
                ))}
              </div>
            </Card>
            <Button onClick={endTurn} className="w-full" size="lg" disabled={loading}>End Turn →</Button>
          </>
        )}

        {gameOver && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-accent mb-2">Empire Complete!</h2>
            <p className="text-muted-foreground mb-4">Total Wealth: {wealth} → {Math.floor(wealth / 5)} 💎</p>
            <Button onClick={restart}>New Empire</Button>
          </div>
        )}

        <Card className="p-4 bg-muted/30 max-h-40 overflow-y-auto mt-4">
          <h4 className="font-bold text-sm mb-2">📜 History</h4>
          {eventLog.map((l, i) => <div key={i} className="text-xs text-muted-foreground">{l}</div>)}
        </Card>
      </Card>
    </div>
  );
};

export default ADAEmpire;
