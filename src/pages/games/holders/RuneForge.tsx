import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditBar } from "@/components/CreditBar";
import { useHolderGame } from "@/hooks/useHolderGame";

const RUNES = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const randomRecipe = () => {
  const picked = new Set<number>();
  while (picked.size < 3) {
    picked.add(Math.floor(Math.random() * RUNES.length));
  }
  return Array.from(picked);
};

export default function RuneForge() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Rune Forge" });
  const [recipe] = useState<number[]>(() => randomRecipe());
  const [selection, setSelection] = useState<number[]>([]);
  const [stability, setStability] = useState(100);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [keysEarned, setKeysEarned] = useState(0);
  const [feedback, setFeedback] = useState("Select exactly 3 runes to forge a perfect alignment.");

  const maskedRecipe = useMemo(() => recipe.map(() => "✶").join(" "), [recipe]);

  const toggleRune = (index: number) => {
    if (status !== "playing") return;
    setSelection((prev) => {
      if (prev.includes(index)) return prev.filter((value) => value !== index);
      if (prev.length >= 3) return prev;
      return [...prev, index];
    });
  };

  const forge = async () => {
    if (selection.length !== 3 || status !== "playing") return;

    const exact = selection.filter((value, idx) => value === recipe[idx]).length;

    if (exact === 3) {
      const keys = 3 + Math.floor(bullsOwned / 3);
      setKeysEarned(keys);
      setStatus("won");
      setFeedback("Perfect zodiac alignment achieved.");
      await awardKeys(keys);
      return;
    }

    const newStability = stability - (30 - exact * 8);
    setStability(newStability);
    setFeedback(`${exact}/3 exact slots matched. Forge stability dropping.`);
    setSelection([]);

    if (newStability <= 0) {
      setStatus("lost");
      setFeedback(`Forge collapsed. Pattern was ${recipe.map((idx) => RUNES[idx]).join(" ")}`);
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
        <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent text-center">✨ Rune Forge</h1>
        <p className="text-muted-foreground text-center mt-2">Precision crafting for holders only.</p>

        <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
          <Card className="p-3 bg-muted/40">Stability: <span className="font-bold">{Math.max(0, stability)}%</span></Card>
          <Card className="p-3 bg-muted/40">Bull Bonus: <span className="font-bold">+{Math.floor(bullsOwned / 3)} keys</span></Card>
          <Card className="p-3 bg-muted/40 col-span-2">Hidden Recipe: <span className="font-bold tracking-widest">{status === "lost" ? recipe.map((idx) => RUNES[idx]).join(" ") : maskedRecipe}</span></Card>
          <Card className="p-3 bg-muted/40 col-span-2">Selected: <span className="font-bold tracking-widest">{selection.map((idx) => RUNES[idx]).join(" ") || "—"}</span></Card>
        </div>

        <p className="text-sm text-muted-foreground mt-4 text-center">{feedback}</p>

        {status === "playing" ? (
          <>
            <div className="grid grid-cols-6 gap-2 mt-4">
              {RUNES.map((rune, index) => (
                <Button
                  key={rune}
                  variant={selection.includes(index) ? "default" : "outline"}
                  onClick={() => toggleRune(index)}
                >
                  {rune}
                </Button>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={forge} disabled={selection.length !== 3}>Forge Alignment</Button>
          </>
        ) : (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xl font-semibold">{status === "won" ? `Forged +${keysEarned} 🔑` : "Forge failed"}</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
