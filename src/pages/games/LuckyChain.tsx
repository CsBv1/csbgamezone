import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Link2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LuckyChain = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const busy = useRef(false);
  const [chain, setChain] = useState(0);
  const multiplier = 1 + chain * 0.3;
  const [diamonds, setDiamonds] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [autoStarting, setAutoStarting] = useState(true);
 
  const applyRun = (data: { id: string; chain: number; diamonds: number; status: string; keys: number }) => {
    setRunId(data.id);
    setChain(data.chain);
    setDiamonds(data.diamonds);
    setKeys(data.keys);
    setGameActive(data.status === "active");
  };

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      const { data, error } = await supabase.rpc("lucky_chain_action", { _action: "start" });
      if (!mounted) return;
      if (error) {
        toast.error(error.message);
      } else if (data) {
        applyRun(data as unknown as Parameters<typeof applyRun>[0]);
      }
      setAutoStarting(false);
    };
    void start();
    return () => { mounted = false; };
  }, []);

  const playAction = async (action: "continue" | "cash_out") => {
    if (busy.current || !runId || !gameActive) return;
    busy.current = true;
    setPlaying(true);
    try {
      if (action === "continue") await new Promise(resolve => setTimeout(resolve, 1500));
      const { data, error } = await supabase.rpc("lucky_chain_action", {
        _action: action, _run_id: runId, _expected_chain: chain,
      });
      if (error) throw error;
      if (data) {
        const result = data as unknown as Parameters<typeof applyRun>[0] & { success: boolean | null; reward: number; awarded: number };
        applyRun(result);
        if (result.status === "paid") {
          toast.success(`💎 Claimed ${result.diamonds.toLocaleString()} diamonds!`);
        } else if (result.success) {
          toast.success(`🔗 Chain ${result.chain}! +${result.reward.toLocaleString()} 💎`);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (error as { message?: string }).message || "Could not save game. Try again.");
      // Recover current state after a lost response without charging another Key.
      const { data } = await supabase.from("lucky_chain_runs").select("id,chain,diamonds,status").eq("id", runId).maybeSingle();
      if (data) applyRun({ ...data, keys });
    } finally {
      busy.current = false;
      setPlaying(false);
    }
  };

  const getChainColor = () => {
    if (chain < 5) return "text-green-500";
    if (chain < 10) return "text-yellow-500";
    if (chain < 15) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">
            🔗 Lucky Chain
          </h1>
          <p className="text-muted-foreground">Build your chain, multiply rewards, but don't get greedy!</p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold text-primary mt-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <span>Keys: {keys} 🔑</span>
            </div>
            {gameActive && (
              <>
                <span>•</span>
                <div className={getChainColor()}>Chain: {chain}</div>
                <span>•</span>
                <div>💎 {diamonds.toLocaleString()}</div>
              </>
            )}
          </div>
        </div>

        {!gameActive ? (
          autoStarting ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Loading game...</p>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <p className="text-muted-foreground">Run finished. Thanks for playing!</p>
              <Button onClick={() => navigate('/dashboard')} size="lg" variant="outline" className="mx-auto">Back to Dashboard</Button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border-4 border-purple-500">
                <Link2 className={`w-20 h-20 ${getChainColor()}`} />
              </div>
              <h2 className={`text-5xl font-bold mt-4 ${getChainColor()}`}>
                Chain {chain}
              </h2>
              <p className="text-2xl text-muted-foreground mt-2">{multiplier.toFixed(1)}x Multiplier</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-500">{diamonds.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Diamonds 💎</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-amber-500">{multiplier.toFixed(1)}x</div>
                <div className="text-xs text-muted-foreground">Multiplier</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-cyan-500">{Math.max(30, 90 - chain * 5)}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={() => playAction("continue")} 
                disabled={playing} 
                size="lg" 
                className="w-full h-20 text-xl bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <TrendingUp className="w-6 h-6 mr-2" />
                Continue Chain
              </Button>
              <Button 
                onClick={() => playAction("cash_out")} 
                disabled={playing || diamonds === 0} 
                size="lg" 
                variant="outline"
                className="w-full"
              >
                💰 Cash Out {diamonds.toLocaleString()} 💎
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>⚠️ Success rate decreases with each chain link!</p>
              <p>💡 Reach chain 20 for a massive bonus!</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LuckyChain;
