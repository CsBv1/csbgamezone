import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAULTS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const VAULT_KEYS = [3, 4, 5, 6, 7];

const CryptoHeist = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Crypto Heist" });
  const [phase, setPhase] = useState<'lobby' | 'cracking' | 'result'>('lobby');
  const [vaultLevel, setVaultLevel] = useState(0);
  const [code, setCode] = useState<number[]>([]);
  const [guess, setGuess] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<{ guess: number[]; correct: number; misplaced: number }[]>([]);
  const maxAttempts = 8;
  const entryCost = 300;

  const startHeist = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    const len = VAULT_KEYS[0];
    const newCode = Array.from({ length: len }, () => Math.floor(Math.random() * 10));
    setCode(newCode);
    setGuess([]);
    setAttempts(0);
    setHistory([]);
    setVaultLevel(0);
    setPhase('cracking');
  };

  const addDigit = (d: number) => {
    if (guess.length < code.length) setGuess(prev => [...prev, d]);
  };

  const submitGuess = async () => {
    if (guess.length !== code.length) return;
    
    let correct = 0, misplaced = 0;
    const codeUsed = [...code];
    const guessUsed = [...guess];
    
    for (let i = 0; i < code.length; i++) {
      if (guessUsed[i] === codeUsed[i]) { correct++; codeUsed[i] = -1; guessUsed[i] = -2; }
    }
    for (let i = 0; i < code.length; i++) {
      if (guessUsed[i] === -2) continue;
      const idx = codeUsed.indexOf(guessUsed[i]);
      if (idx !== -1) { misplaced++; codeUsed[idx] = -1; }
    }

    setHistory(prev => [...prev, { guess: [...guess], correct, misplaced }]);
    setGuess([]);
    
    if (correct === code.length) {
      if (vaultLevel < VAULTS.length - 1) {
        const nextLevel = vaultLevel + 1;
        setVaultLevel(nextLevel);
        const len = VAULT_KEYS[nextLevel];
        setCode(Array.from({ length: len }, () => Math.floor(Math.random() * 10)));
        setHistory([]);
        setAttempts(0);
      } else {
        const keys = 5 + Math.floor(bullsOwned / 2);
        await awardKeys(keys);
        setPhase('result');
      }
    } else if (attempts + 1 >= maxAttempts) {
      const keys = vaultLevel >= 3 ? 3 : vaultLevel >= 1 ? 1 : 0;
      if (keys > 0) await awardKeys(keys);
      setPhase('result');
    } else {
      setAttempts(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🔓 Crypto Heist</h1>
          <p className="text-muted-foreground">Crack 5 vault codes to pull off the ultimate heist!</p>
        </div>

        {phase === 'lobby' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • Crack codes like Mastermind</p>
            <div className="flex justify-center gap-2">{VAULTS.map((v, i) => <span key={v} className="px-3 py-1 rounded bg-muted text-xs">{v}</span>)}</div>
            <Button onClick={startHeist} disabled={isLoading} size="lg">Start Heist</Button>
          </div>
        )}

        {phase === 'cracking' && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>🏦 Vault: {VAULTS[vaultLevel]}</span>
              <span>Attempt {attempts + 1}/{maxAttempts}</span>
              <span>Code: {code.length} digits</span>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: code.length }).map((_, i) => (
                <div key={i} className="w-10 h-12 border-2 border-primary rounded flex items-center justify-center text-xl font-bold">
                  {guess[i] !== undefined ? guess[i] : '?'}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
              {[0,1,2,3,4,5,6,7,8,9].map(d => (
                <Button key={d} onClick={() => addDigit(d)} variant="outline" size="sm">{d}</Button>
              ))}
            </div>

            <div className="flex justify-center gap-2">
              <Button onClick={() => setGuess([])} variant="outline">Clear</Button>
              <Button onClick={submitGuess} disabled={guess.length !== code.length}>Submit</Button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-sm">
                  <span>{h.guess.join('')}</span>
                  <span className="text-green-400">✅{h.correct}</span>
                  <span className="text-yellow-400">🔄{h.misplaced}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{vaultLevel >= VAULTS.length - 1 ? '💎 Full Heist Complete!' : `Reached ${VAULTS[vaultLevel]} Vault`}</p>
            <Button onClick={() => setPhase('lobby')}>Try Again</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CryptoHeist;
