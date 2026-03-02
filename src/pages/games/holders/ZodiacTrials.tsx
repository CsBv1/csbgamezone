import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditBar } from "@/components/CreditBar";
import { useHolderGame } from "@/hooks/useHolderGame";

const ZODIAC = [
  "♈ Aries", "♉ Taurus", "♊ Gemini", "♋ Cancer", "♌ Leo", "♍ Virgo",
  "♎ Libra", "♏ Scorpio", "♐ Sagittarius", "♑ Capricorn", "♒ Aquarius", "♓ Pisces"
];

export default function ZodiacTrials() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Zodiac Trials" });
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [wins, setWins] = useState(0);
  const [fails, setFails] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [keysEarned, setKeysEarned] = useState(0);
  const [log, setLog] = useState("Choose signs strategically: 5 wins before 3 fails.");

  const available = useMemo(() => ZODIAC.map((_, idx) => idx).filter((idx) => !used.has(idx)), [used]);

  const runTrial = async (index: number) => {
    if (status !== "playing" || used.has(index)) return;

    const nextUsed = new Set(used);
    nextUsed.add(index);
    setUsed(nextUsed);

    const baseRoll = Math.floor(Math.random() * 100) + 1;
    const signBonus = index % 4;
    const bullBonus = Math.floor(bullsOwned / 3);
    const totalRoll = baseRoll + signBonus + bullBonus;

    if (totalRoll >= 58) {
      const newWins = wins + 1;
      setWins(newWins);
      setLog(`${ZODIAC[index]} succeeded (${totalRoll}).`);

      if (newWins >= 5) {
        const keys = 3 + Math.floor(bullsOwned / 4);
        setKeysEarned(keys);
        setStatus("won");
        await awardKeys(keys);
      }
      return;
    }

    const newFails = fails + 1;
    setFails(newFails);
    setLog(`${ZODIAC[index]} failed (${totalRoll}).`);

    if (newFails >= 3 || available.length <= 1) {
      setStatus("lost");
    }
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
        <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent text-center">🌌 Zodiac Trials</h1>
        <p className="text-muted-foreground text-center mt-2">Advance holder gauntlet powered by the 12 starsigns.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-sm">
          <Card className="p-3 bg-muted/40">Wins: <span className="font-bold">{wins}/5</span></Card>
          <Card className="p-3 bg-muted/40">Fails: <span className="font-bold">{fails}/3</span></Card>
          <Card className="p-3 bg-muted/40">Bull Bonus: <span className="font-bold">+{Math.floor(bullsOwned / 3)} roll</span></Card>
          <Card className="p-3 bg-muted/40">Unused: <span className="font-bold">{available.length}</span></Card>
        </div>

        <Card className="p-3 bg-muted/30 mt-4 text-sm text-muted-foreground">{log}</Card>

        {status === "playing" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {ZODIAC.map((sign, index) => (
              <Button
                key={sign}
                variant="outline"
                onClick={() => runTrial(index)}
                disabled={used.has(index)}
              >
                {sign}
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xl font-semibold">{status === "won" ? `Constellation mastered: +${keysEarned} 🔑` : "Trial sequence failed"}</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
