import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Shield, Flame } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "lobby" | "ritual" | "result";
type RuneMove = "astral" | "ward" | "inferno";

const ENTRY_COST = 340;
const TOTAL_MOVES = 6;

const RuneConclave = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Rune Conclave" });

  const [phase, setPhase] = useState<Phase>("lobby");
  const [moves, setMoves] = useState(1);
  const [resonance, setResonance] = useState(0);
  const [stability, setStability] = useState(55);
  const [chain, setChain] = useState(0);

  const beginConclave = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!data || (data as any).balance < ENTRY_COST) {
      toast.error("Not enough credits to open the conclave.");
      return;
    }

    await supabase
      .from("user_credits")
      .update({ balance: (data as any).balance - ENTRY_COST })
      .eq("user_id", userId);

    setMoves(1);
    setResonance(0);
    setStability(55);
    setChain(0);
    setPhase("ritual");
  };

  const castRune = async (move: RuneMove) => {
    const roll = Math.random();
    const holderBonus = Math.floor(bullsOwned / 3);

    let addResonance = 0;
    let addStability = 0;
    let nextChain = chain;

    if (move === "astral") {
      addResonance = roll > 0.3 ? 22 : 11;
      addStability = 4;
    }

    if (move === "ward") {
      addResonance = 12;
      addStability = roll > 0.4 ? 10 : 5;
    }

    if (move === "inferno") {
      addResonance = roll > 0.5 ? 30 : 8;
      addStability = roll > 0.6 ? -4 : -11;
    }

    addResonance += holderBonus;

    if (addResonance >= 20) {
      nextChain += 1;
    } else {
      nextChain = 0;
    }

    const chainBonus = nextChain >= 2 ? nextChain * 2 : 0;
    const newResonance = resonance + addResonance + chainBonus;
    const newStability = Math.max(0, Math.min(100, stability + addStability));

    setResonance(newResonance);
    setStability(newStability);
    setChain(nextChain);

    if (moves >= TOTAL_MOVES || newStability <= 0) {
      const score = Math.max(0, Math.floor((newResonance * 1.3 + newStability) / 14));
      const keys = score >= 24 ? 5 : score >= 18 ? 4 : score >= 12 ? 3 : score >= 8 ? 2 : 1;
      await awardKeys(keys);
      setPhase("result");
      return;
    }

    setMoves((prev) => prev + 1);
  };

  const conclaveScore = Math.floor((resonance * 1.3 + stability) / 14);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🔮 Rune Conclave</h1>
          <p className="text-muted-foreground">Chain elite rune casts and maintain stability to secure maximum key rewards.</p>
        </div>

        {phase === "lobby" && (
          <div className="text-center space-y-4">
            <p>Entry: {ENTRY_COST} 💰 • {TOTAL_MOVES} rune casts</p>
            <Button onClick={beginConclave} disabled={isLoading} size="lg">Open Conclave</Button>
          </div>
        )}

        {phase === "ritual" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Card className="p-3">Move <span className="font-bold">{moves}/{TOTAL_MOVES}</span></Card>
              <Card className="p-3">Resonance <span className="font-bold">{resonance}</span></Card>
              <Card className="p-3">Stability <span className="font-bold">{stability}</span></Card>
              <Card className="p-3">Chain <span className="font-bold">{chain}</span></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => castRune("astral")} className="h-20 flex-col">
                <Sparkles className="w-5 h-5 mb-1" /> Astral Rune
              </Button>
              <Button onClick={() => castRune("ward")} className="h-20 flex-col">
                <Shield className="w-5 h-5 mb-1" /> Ward Rune
              </Button>
              <Button onClick={() => castRune("inferno")} className="h-20 flex-col">
                <Flame className="w-5 h-5 mb-1" /> Inferno Rune
              </Button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">Conclave Score: {conclaveScore}</p>
            <p className="text-muted-foreground">Sustained chains dramatically increase final rewards.</p>
            <Button onClick={() => setPhase("lobby")}>Start New Conclave</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RuneConclave;
