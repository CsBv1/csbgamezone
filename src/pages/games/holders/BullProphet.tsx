import { useState, useCallback } from "react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MARKETS = ['📈 ADA/USD', '📊 BTC/ETH', '📉 SOL/ADA', '💹 BULL/ADA'];

const BullProphet = () => {
  const { isLoading, isAuthorized, totalBulls, awardKeys, navigate } = useHolderGame({ gameName: "Bull Prophet" });
  const [balance, setBalance] = useState(1000);
  const [positions, setPositions] = useState<{market: string; direction: 'long' | 'short'; amount: number}[]>([]);
  const [day, setDay] = useState(1);
  const [log, setLog] = useState<string[]>(['📊 Markets are open!']);
  const [keysEarned, setKeysEarned] = useState(0);

  const openPosition = (market: string, direction: 'long' | 'short') => {
    const amount = Math.min(100, balance);
    if (amount <= 0 || positions.length >= 4) return;
    setBalance(b => b - amount);
    setPositions(p => [...p, { market, direction, amount }]);
    setLog(prev => [`📝 Opened ${direction} on ${market} for ${amount}`, ...prev].slice(0, 8));
  };

  const advanceDay = useCallback(async () => {
    const results: string[] = [];
    let newBalance = balance;
    let newKeys = keysEarned;

    const closedPositions = positions.map(pos => {
      const change = (Math.random() - 0.45) * 40 + totalBulls;
      const won = (pos.direction === 'long' && change > 0) || (pos.direction === 'short' && change < 0);
      const profit = won ? Math.floor(pos.amount * (1 + Math.abs(change) / 100)) : 0;
      newBalance += profit;
      if (won) {
        const keys = Math.max(1, Math.floor(profit / 50));
        newKeys += keys;
        results.push(`✅ ${pos.market} ${pos.direction}: +${profit} (+${keys}🔑)`);
      } else {
        results.push(`❌ ${pos.market} ${pos.direction}: -${pos.amount}`);
      }
      return null;
    });

    setBalance(newBalance + 50);
    setPositions([]);
    setDay(d => d + 1);
    setLog([`📅 Day ${day} results:`, ...results, ...log].slice(0, 12));
    setKeysEarned(newKeys);

    if (day % 5 === 0 && newKeys > 0) {
      await awardKeys(newKeys);
      results.push(`🏆 Week end! Claimed ${newKeys} 🔑`);
      setKeysEarned(0);
    }
  }, [balance, positions, day, log, keysEarned, totalBulls, awardKeys]);

  if (isLoading || !isAuthorized) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-foreground animate-pulse">Loading Bull Prophet...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">📊 Bull Prophet</h1>
        </div>
        <div className="flex gap-3 text-sm text-foreground justify-center">
          <span>💰 {balance}</span><span>📅 Day {day}</span><span>🔑 {keysEarned}</span>
        </div>
        {MARKETS.map(m => (
          <Card key={m} className="border-primary/30">
            <CardContent className="pt-3 flex justify-between items-center">
              <span className="text-foreground">{m}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openPosition(m, 'long')} disabled={balance < 100 || positions.length >= 4}>📈 Long</Button>
                <Button size="sm" variant="outline" onClick={() => openPosition(m, 'short')} disabled={balance < 100 || positions.length >= 4}>📉 Short</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={advanceDay} className="w-full bg-primary">📅 Next Day ({positions.length} positions)</Button>
        <Card className="border-primary/30"><CardContent className="pt-4 space-y-1">
          {log.map((l, i) => <p key={i} className="text-xs text-foreground">{l}</p>)}
        </CardContent></Card>
      </div>
    </div>
  );
};

export default BullProphet;
