import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Shield, TrendingUp } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "lobby" | "govern" | "result";
type Policy = "invest" | "fortify" | "expand";

const ENTRY_COST = 320;
const TOTAL_ROUNDS = 6;

const StakeDynasty = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Stake Dynasty" });

  const [phase, setPhase] = useState<Phase>("lobby");
  const [round, setRound] = useState(1);
  const [control, setControl] = useState(20);
  const [treasury, setTreasury] = useState(30);
  const [stability, setStability] = useState(25);

  const startDynasty = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!data || (data as any).balance < ENTRY_COST) {
      toast.error("Not enough credits to govern this dynasty.");
      return;
    }

    await supabase
      .from("user_credits")
      .update({ balance: (data as any).balance - ENTRY_COST })
      .eq("user_id", userId);

    setRound(1);
    setControl(20);
    setTreasury(30);
    setStability(25);
    setPhase("govern");
  };

  const enactPolicy = async (policy: Policy) => {
    const bonus = Math.floor(bullsOwned / 5);
    const roll = Math.random();

    let nextControl = control;
    let nextTreasury = treasury;
    let nextStability = stability;

    if (policy === "invest") {
      nextTreasury += roll > 0.35 ? 20 : 10;
      nextControl += 6 + bonus;
      nextStability -= 4;
    }

    if (policy === "fortify") {
      nextStability += 18 + bonus;
      nextControl += 8;
      nextTreasury -= 6;
    }

    if (policy === "expand") {
      nextControl += roll > 0.45 ? 24 : 11;
      nextTreasury += 8;
      nextStability -= 8;
    }

    setControl(Math.max(0, nextControl));
    setTreasury(Math.max(0, nextTreasury));
    setStability(Math.max(0, Math.min(100, nextStability)));

    if (round >= TOTAL_ROUNDS) {
      const score = Math.max(0, Math.floor((nextControl * 1.4 + nextTreasury + nextStability * 1.2) / 10));
      const keys = score >= 28 ? 5 : score >= 22 ? 4 : score >= 16 ? 3 : score >= 11 ? 2 : 1;
      await awardKeys(keys);
      setPhase("result");
      return;
    }

    setRound((prev) => prev + 1);
  };

  const dynastyScore = Math.floor((control * 1.4 + treasury + stability * 1.2) / 10);

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🏛️ Stake Dynasty</h1>
          <p className="text-muted-foreground">Balance economy, territory, and stability to dominate your holder dynasty.</p>
        </div>

        {phase === "lobby" && (
          <div className="text-center space-y-4">
            <p>Entry: {ENTRY_COST} 💰 • {TOTAL_ROUNDS} governance rounds</p>
            <Button onClick={startDynasty} disabled={isLoading} size="lg">Launch Dynasty</Button>
          </div>
        )}

        {phase === "govern" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Card className="p-3">Round <span className="font-bold">{round}/{TOTAL_ROUNDS}</span></Card>
              <Card className="p-3">Control <span className="font-bold">{control}</span></Card>
              <Card className="p-3">Treasury <span className="font-bold">{treasury}</span></Card>
              <Card className="p-3">Stability <span className="font-bold">{stability}</span></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => enactPolicy("invest")} className="h-20 flex-col">
                <TrendingUp className="w-5 h-5 mb-1" /> Invest
              </Button>
              <Button onClick={() => enactPolicy("fortify")} className="h-20 flex-col">
                <Shield className="w-5 h-5 mb-1" /> Fortify
              </Button>
              <Button onClick={() => enactPolicy("expand")} className="h-20 flex-col">
                <Building2 className="w-5 h-5 mb-1" /> Expand
              </Button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">Dynasty Score: {dynastyScore}</p>
            <p className="text-muted-foreground">Higher dynasty score = more keys banked.</p>
            <Button onClick={() => setPhase("lobby")}>Run Another Dynasty</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StakeDynasty;
