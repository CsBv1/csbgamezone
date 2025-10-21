import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useGameLogic } from "@/hooks/useGameLogic";

const VaultCracker = () => {
  const navigate = useNavigate();
  const { credits, deductCredits, awardCredits } = useGameLogic("VaultCracker");
  const [playing, setPlaying] = useState(false);
  const [code, setCode] = useState<number[]>([]);
  const [target, setTarget] = useState<number[]>([]);
  const betAmount = 50;

  const startGame = async () => {
    if (credits < betAmount) {
      toast.error("Not enough credits!");
      return;
    }
    await deductCredits(betAmount);
    setPlaying(true);
    setCode([]);
    setTarget(Array(4).fill(0).map(() => Math.floor(Math.random() * 10)));
  };

  const addDigit = async (digit: number) => {
    if (!playing || code.length >= 4) return;
    const newCode = [...code, digit];
    setCode(newCode);

    if (newCode.length === 4) {
      const matches = newCode.filter((d, i) => d === target[i]).length;
      if (matches === 4) {
        const winAmount = betAmount * 10;
        await awardCredits(winAmount);
        toast.success(`🐂 Cracked! Won ${winAmount} credits!`);
      } else {
        toast.error(`${matches}/4 correct!`);
      }
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Vault Cracker 🐂</h1>
          <p className="text-muted-foreground">Crack the code!</p>
          <div className="text-2xl font-bold text-primary mt-4">Credits: {credits}</div>
        </div>
        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>
        {playing && (<div className="text-center mb-6"><div className="flex gap-2 justify-center">{Array(4).fill(0).map((_, i) => (<div key={i} className="bg-primary/20 p-4 rounded border-2 border-primary w-16 h-16 flex items-center justify-center"><p className="text-2xl font-bold">{code[i] ?? "?"}</p></div>))}</div></div>)}
        {playing ? (<div className="grid grid-cols-5 gap-2">{Array(10).fill(0).map((_, i) => (<Button key={i} onClick={() => addDigit(i)} size="lg">{i}</Button>))}</div>) : (<Button onClick={startGame} size="lg" className="w-full">Start ({betAmount})</Button>)}
      </Card>
    </div>
  );
};

export default VaultCracker;
