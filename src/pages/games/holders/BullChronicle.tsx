import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScrollText, Crown, Shield } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Phase = "lobby" | "chapter" | "result";
type Choice = "diplomacy" | "expedition" | "ritual";

const TOTAL_CHAPTERS = 5;
const ENTRY_COST = 300;

const BullChronicle = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Chronicle" });

  const [phase, setPhase] = useState<Phase>("lobby");
  const [chapter, setChapter] = useState(1);
  const [resolve, setResolve] = useState(0);
  const [influence, setInfluence] = useState(0);
  const [ward, setWard] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const startCampaign = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!data || (data as any).balance < ENTRY_COST) {
      toast.error("Not enough credits to begin campaign.");
      return;
    }

    await supabase
      .from("user_credits")
      .update({ balance: (data as any).balance - ENTRY_COST })
      .eq("user_id", userId);

    setChapter(1);
    setResolve(0);
    setInfluence(0);
    setWard(0);
    setLog([]);
    setPhase("chapter");
  };

  const playChoice = async (choice: Choice) => {
    const holderBonus = Math.floor(bullsOwned / 4);
    const roll = Math.random();

    let addResolve = 0;
    let addInfluence = 0;
    let addWard = 0;

    if (choice === "diplomacy") {
      addInfluence = roll > 0.35 ? 18 : 10;
      addWard = 8;
    }

    if (choice === "expedition") {
      addResolve = roll > 0.4 ? 22 : 8;
      addInfluence = 6;
    }

    if (choice === "ritual") {
      addWard = roll > 0.45 ? 20 : 7;
      addResolve = 6;
    }

    addResolve += holderBonus;
    addInfluence += holderBonus;
    addWard += holderBonus;

    setResolve((prev) => prev + addResolve);
    setInfluence((prev) => prev + addInfluence);
    setWard((prev) => prev + addWard);
    setLog((prev) => [
      ...prev,
      `Chapter ${chapter}: ${choice} → +${addResolve} resolve, +${addInfluence} influence, +${addWard} ward`,
    ]);

    if (chapter >= TOTAL_CHAPTERS) {
      const score = resolve + influence + ward + addResolve + addInfluence + addWard;
      const keys = score >= 180 ? 5 : score >= 140 ? 4 : score >= 100 ? 3 : score >= 65 ? 2 : 1;
      await awardKeys(keys);
      setPhase("result");
      return;
    }

    setChapter((prev) => prev + 1);
  };

  const totalScore = resolve + influence + ward;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">📜 Bull Chronicle</h1>
          <p className="text-muted-foreground">Branching holder campaign with tactical decisions and seasonal rewards.</p>
        </div>

        {phase === "lobby" && (
          <div className="text-center space-y-4">
            <p>Entry: {ENTRY_COST} 💰 • {TOTAL_CHAPTERS} tactical chapters</p>
            <p className="text-sm text-muted-foreground">Holder bonus scales from your bulls.</p>
            <Button onClick={startCampaign} disabled={isLoading} size="lg">Start Campaign</Button>
          </div>
        )}

        {phase === "chapter" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Card className="p-3">Chapter: <span className="font-bold">{chapter}/{TOTAL_CHAPTERS}</span></Card>
              <Card className="p-3">Resolve: <span className="font-bold">{resolve}</span></Card>
              <Card className="p-3">Influence: <span className="font-bold">{influence}</span></Card>
              <Card className="p-3">Ward: <span className="font-bold">{ward}</span></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => playChoice("diplomacy")} className="h-20 flex-col">
                <Crown className="w-5 h-5 mb-1" /> Diplomacy
              </Button>
              <Button onClick={() => playChoice("expedition")} className="h-20 flex-col">
                <ScrollText className="w-5 h-5 mb-1" /> Expedition
              </Button>
              <Button onClick={() => playChoice("ritual")} className="h-20 flex-col">
                <Shield className="w-5 h-5 mb-1" /> Ritual
              </Button>
            </div>

            <div className="text-xs text-muted-foreground max-h-28 overflow-y-auto space-y-1">
              {log.slice(-6).map((entry, index) => (
                <p key={`${entry}-${index}`}>{entry}</p>
              ))}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">Final Chronicle Score: {totalScore}</p>
            <p className="text-muted-foreground">
              {totalScore >= 180 ? "Legend Chronicle!" : totalScore >= 140 ? "Epic Chronicle!" : "Campaign complete!"}
            </p>
            <Button onClick={() => setPhase("lobby")}>Play Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullChronicle;
