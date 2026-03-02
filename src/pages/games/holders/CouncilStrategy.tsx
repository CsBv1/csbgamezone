import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditBar } from "@/components/CreditBar";
import { useHolderGame } from "@/hooks/useHolderGame";

type Policy = {
  id: string;
  title: string;
  influence: number;
  treasury: number;
  morale: number;
};

const POLICIES: Policy[] = [
  { id: "trade-pact", title: "Trade Pact", influence: 8, treasury: 12, morale: -4 },
  { id: "festival", title: "Great Festival", influence: 5, treasury: -10, morale: 14 },
  { id: "defense", title: "Fortify Borders", influence: 10, treasury: -6, morale: 3 },
  { id: "tax-reform", title: "Tax Reform", influence: -3, treasury: 15, morale: -8 },
  { id: "guild-charter", title: "Guild Charter", influence: 12, treasury: 4, morale: 2 },
  { id: "oracle-fund", title: "Oracle Funding", influence: 6, treasury: -4, morale: 9 },
];

export default function CouncilStrategy() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Council Strategy" });
  const [turn, setTurn] = useState(1);
  const [influence, setInfluence] = useState(50);
  const [treasury, setTreasury] = useState(50);
  const [morale, setMorale] = useState(50);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [keysEarned, setKeysEarned] = useState(0);
  const [log, setLog] = useState("Lead the council for 8 rounds without collapsing the kingdom.");

  const applyPolicy = async (policy: Policy) => {
    if (status !== "playing") return;

    const bonus = Math.floor(bullsOwned / 2);
    const nextInfluence = influence + policy.influence + bonus;
    const nextTreasury = treasury + policy.treasury;
    const nextMorale = morale + policy.morale;

    setInfluence(nextInfluence);
    setTreasury(nextTreasury);
    setMorale(nextMorale);
    setLog(`${policy.title}: I ${policy.influence + bonus >= 0 ? "+" : ""}${policy.influence + bonus}, T ${policy.treasury >= 0 ? "+" : ""}${policy.treasury}, M ${policy.morale >= 0 ? "+" : ""}${policy.morale}`);

    if (nextInfluence <= 0 || nextTreasury <= 0 || nextMorale <= 0) {
      setStatus("lost");
      return;
    }

    if (turn >= 8) {
      const score = nextInfluence + nextTreasury + nextMorale;
      if (score >= 210) {
        const keys = 3 + Math.floor(bullsOwned / 2);
        setKeysEarned(keys);
        setStatus("won");
        await awardKeys(keys);
      } else {
        setStatus("lost");
      }
      return;
    }

    setTurn((prev) => prev + 1);
  };

  if (isLoading) {
    return <div className="min-h-screen bull-pattern flex items-center justify-center"><div className="text-2xl text-primary animate-pulse">Loading...</div></div>;
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
        <CreditBar />
      </div>

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent text-center">🏛️ Council Strategy</h1>
        <p className="text-muted-foreground text-center mt-2">Holder-only governance simulation.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-sm">
          <Card className="p-3 bg-muted/40">Round: <span className="font-bold">{turn}/8</span></Card>
          <Card className="p-3 bg-muted/40">Influence: <span className="font-bold">{influence}</span></Card>
          <Card className="p-3 bg-muted/40">Treasury: <span className="font-bold">{treasury}</span></Card>
          <Card className="p-3 bg-muted/40">Morale: <span className="font-bold">{morale}</span></Card>
        </div>

        <Card className="p-3 bg-muted/30 mt-4 text-sm text-muted-foreground">{log}</Card>

        {status === "playing" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            {POLICIES.map((policy) => (
              <Button key={policy.id} variant="outline" onClick={() => applyPolicy(policy)}>{policy.title}</Button>
            ))}
          </div>
        ) : (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xl font-semibold">{status === "won" ? `Council stabilized: +${keysEarned} 🔑` : "Council collapsed"}</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
