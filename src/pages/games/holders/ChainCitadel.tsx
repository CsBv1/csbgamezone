import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditBar } from "@/components/CreditBar";
import { useHolderGame } from "@/hooks/useHolderGame";

const initialSectors = [100, 100, 100, 100, 100];

export default function ChainCitadel() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Chain Citadel" });
  const [sectors, setSectors] = useState<number[]>(initialSectors);
  const [wave, setWave] = useState(1);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [keysEarned, setKeysEarned] = useState(0);
  const [report, setReport] = useState("Fortify a sector each wave before enemy strikes.");

  const defendWave = async (sectorIndex: number) => {
    if (status !== "playing") return;

    const fortified = sectors.map((value, idx) => (idx === sectorIndex ? Math.min(100, value + 20) : value));

    const attacked = fortified.map((value) => {
      if (value <= 0) return 0;
      const baseDamage = 12 + Math.floor(Math.random() * 18);
      const reducedDamage = Math.max(4, baseDamage - Math.floor(bullsOwned / 3));
      return Math.max(0, value - reducedDamage);
    });

    const aliveSectors = attacked.filter((value) => value > 0).length;
    setSectors(attacked);
    setReport(`Wave ${wave}: ${aliveSectors}/5 sectors still standing.`);

    if (aliveSectors <= 0) {
      setStatus("lost");
      return;
    }

    if (wave >= 6) {
      if (aliveSectors >= 2) {
        const keys = 3 + Math.floor(aliveSectors / 2) + Math.floor(bullsOwned / 4);
        setKeysEarned(keys);
        setStatus("won");
        await awardKeys(keys);
      } else {
        setStatus("lost");
      }
      return;
    }

    setWave((prev) => prev + 1);
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
        <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent text-center">🛡️ Chain Citadel</h1>
        <p className="text-muted-foreground text-center mt-2">Holder-only defense simulation.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 text-sm">
          <Card className="p-3 bg-muted/40">Wave: <span className="font-bold">{wave}/6</span></Card>
          <Card className="p-3 bg-muted/40">Bull Shield: <span className="font-bold">-{Math.floor(bullsOwned / 3)} dmg</span></Card>
          <Card className="p-3 bg-muted/40">Status: <span className="font-bold">{status.toUpperCase()}</span></Card>
        </div>

        <Card className="p-3 bg-muted/30 mt-4 text-sm text-muted-foreground">{report}</Card>

        {status === "playing" ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-4">
            {sectors.map((hp, idx) => (
              <Button key={idx} variant="outline" onClick={() => defendWave(idx)}>
                S{idx + 1} • {hp}%
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xl font-semibold">{status === "won" ? `Citadel defended: +${keysEarned} 🔑` : "Citadel breached"}</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
