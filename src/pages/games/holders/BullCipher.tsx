import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditBar } from "@/components/CreditBar";
import { useHolderGame } from "@/hooks/useHolderGame";

const SYMBOLS = ["🐂", "💎", "🔑", "🏆", "⚡", "🌙"];

const buildSequence = () =>
  Array.from({ length: 4 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

export default function BullCipher() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ gameName: "Bull Cipher" });
  const [target] = useState<string[]>(() => buildSequence());
  const [attempts, setAttempts] = useState(6);
  const [input, setInput] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [keysEarned, setKeysEarned] = useState(0);
  const [hint, setHint] = useState("Build the 4-symbol cipher and decrypt the vault.");

  const maskedTarget = useMemo(() => target.map(() => "●").join(" "), [target]);

  const pushSymbol = (symbol: string) => {
    if (status !== "playing" || input.length >= 4) return;
    setInput((prev) => [...prev, symbol]);
  };

  const clearInput = () => setInput([]);

  const submit = async () => {
    if (input.length !== 4 || status !== "playing") return;

    const exactMatches = input.filter((value, i) => value === target[i]).length;

    if (exactMatches === 4) {
      const keys = 3 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      setStatus("won");
      setHint("Cipher solved. Vault decrypted.");
      await awardKeys(keys);
      return;
    }

    const nextAttempts = attempts - 1;
    setAttempts(nextAttempts);
    setHint(`${exactMatches}/4 symbols matched position.`);
    setInput([]);

    if (nextAttempts <= 0) {
      setStatus("lost");
      setHint(`Cipher lockout. Code was ${target.join(" ")}`);
    }
  };

  const reset = () => {
    navigate("/dashboard");
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
        <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent text-center">🧠 Bull Cipher</h1>
        <p className="text-muted-foreground text-center mt-2">Holders-only tactical decryption challenge.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Card className="p-3 bg-muted/40">Attempts: <span className="font-bold">{attempts}</span></Card>
          <Card className="p-3 bg-muted/40">Bull Bonus: <span className="font-bold">+{Math.floor(bullsOwned / 2)} keys</span></Card>
          <Card className="p-3 bg-muted/40 col-span-2">Target Cipher: <span className="font-bold tracking-wider">{status === "lost" ? target.join(" ") : maskedTarget}</span></Card>
          <Card className="p-3 bg-muted/40 col-span-2">Your Input: <span className="font-bold tracking-wider">{input.join(" ") || "—"}</span></Card>
        </div>

        <p className="text-sm text-muted-foreground mt-4 text-center">{hint}</p>

        {status === "playing" ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {SYMBOLS.map((symbol) => (
                <Button key={symbol} variant="outline" onClick={() => pushSymbol(symbol)}>{symbol}</Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" onClick={clearInput}>Clear</Button>
              <Button onClick={submit} disabled={input.length !== 4}>Decrypt</Button>
            </div>
          </>
        ) : (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xl font-semibold">{status === "won" ? `Unlocked +${keysEarned} 🔑` : "Try again from Dashboard"}</p>
            <Button onClick={reset}>{status === "won" ? "Return to Dashboard" : "Back to Dashboard"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
