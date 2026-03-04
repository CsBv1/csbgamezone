import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gavel, TrendingUp, TrendingDown } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuctionItem {
  name: string;
  emoji: string;
  trueValue: number;
  hint: string;
}

const BullAuction = () => {
  const navigate = useNavigate();
  const { userId, isLoading, bullsOwned, awardKeys } = useHolderGame({ gameName: "Bull Auction" });
  const [phase, setPhase] = useState<'lobby' | 'bidding' | 'result'>('lobby');
  const [budget, setBudget] = useState(0);
  const [round, setRound] = useState(1);
  const [profit, setProfit] = useState(0);
  const [currentItem, setCurrentItem] = useState<AuctionItem | null>(null);
  const [aiPrice, setAiPrice] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const entryCost = 200;
  const maxRounds = 8;

  const items: AuctionItem[] = [
    { name: 'Ancient Bull Statue', emoji: '🗿', trueValue: 80, hint: 'Historical artifact' },
    { name: 'Diamond Horn', emoji: '💎', trueValue: 120, hint: 'Rare gemstone piece' },
    { name: 'Golden Saddle', emoji: '🏆', trueValue: 60, hint: 'Ornamental gear' },
    { name: 'Cardano Relic', emoji: '🔮', trueValue: 150, hint: 'Blockchain artifact' },
    { name: 'Bull Crown', emoji: '👑', trueValue: 200, hint: 'Royal headpiece' },
    { name: 'Mystic Rune Stone', emoji: '🪨', trueValue: 90, hint: 'Ancient inscription' },
    { name: 'Crystal Horn Ring', emoji: '💍', trueValue: 110, hint: 'Enchanted jewelry' },
    { name: 'Stake Certificate', emoji: '📜', trueValue: 70, hint: 'Delegation proof' },
  ];

  const start = async () => {
    if (!userId) return;
    const { data } = await supabase.from('user_credits').select('balance').eq('user_id', userId).single();
    if (!data || (data as any).balance < entryCost) { toast.error('Not enough credits!'); return; }
    await supabase.from('user_credits').update({ balance: (data as any).balance - entryCost }).eq('user_id', userId);
    setBudget(500 + bullsOwned * 10);
    setRound(1);
    setProfit(0);
    setLog([]);
    nextItem();
    setPhase('bidding');
  };

  const nextItem = () => {
    const item = items[Math.floor(Math.random() * items.length)];
    const variance = Math.floor(Math.random() * 60) - 30;
    setCurrentItem({ ...item, trueValue: item.trueValue + variance });
    setAiPrice(item.trueValue + Math.floor(Math.random() * 40) - 20);
  };

  const bid = (bidAmount: number) => {
    if (!currentItem || budget < bidAmount) return;

    const won = bidAmount > aiPrice;
    let roundProfit = 0;

    if (won) {
      roundProfit = currentItem.trueValue - bidAmount;
      setBudget(prev => prev - bidAmount + currentItem.trueValue);
    }

    setProfit(prev => prev + roundProfit);
    setLog(prev => [...prev, `R${round}: ${currentItem.emoji} ${won ? 'WON' : 'LOST'} bid:${bidAmount} ai:${aiPrice} ${won ? `profit:${roundProfit}` : ''}`]);

    if (round >= maxRounds) {
      finishAuction(profit + roundProfit);
    } else {
      setRound(prev => prev + 1);
      nextItem();
    }
  };

  const skip = () => {
    setLog(prev => [...prev, `R${round}: Skipped ${currentItem?.emoji}`]);
    if (round >= maxRounds) {
      finishAuction(profit);
    } else {
      setRound(prev => prev + 1);
      nextItem();
    }
  };

  const finishAuction = async (finalProfit: number) => {
    const keys = finalProfit >= 200 ? 5 : finalProfit >= 100 ? 3 : finalProfit >= 50 ? 2 : finalProfit > 0 ? 1 : 0;
    if (keys > 0) await awardKeys(keys);
    setPhase('result');
  };

  const bidOptions = currentItem ? [
    Math.floor(currentItem.trueValue * 0.5),
    Math.floor(currentItem.trueValue * 0.8),
    Math.floor(currentItem.trueValue * 1.1),
    Math.floor(currentItem.trueValue * 1.3),
  ] : [];

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back
      </Button>
      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">🔨 Bull Auction</h1>
          <p className="text-muted-foreground">Outbid the AI to buy artifacts and flip for profit!</p>
        </div>

        {phase === 'lobby' && (
          <div className="text-center space-y-4">
            <p>Entry: {entryCost} 💰 • 8 auction rounds</p>
            <Button onClick={start} disabled={isLoading} size="lg">Enter Auction</Button>
          </div>
        )}

        {phase === 'bidding' && currentItem && (
          <div className="space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Round {round}/{maxRounds}</span>
              <span>💰 Budget: {budget}</span>
              <span>{profit >= 0 ? <TrendingUp className="inline w-5 h-5 text-green-500" /> : <TrendingDown className="inline w-5 h-5 text-red-500" />} Profit: {profit}</span>
            </div>
            <Card className="p-6 text-center bg-primary/10">
              <div className="text-5xl mb-2">{currentItem.emoji}</div>
              <div className="text-xl font-bold">{currentItem.name}</div>
              <div className="text-sm text-muted-foreground">Hint: {currentItem.hint}</div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {bidOptions.map((amount, i) => (
                <Button key={i} onClick={() => bid(amount)} disabled={budget < amount} className="h-14">
                  <Gavel className="w-4 h-4 mr-2" /> Bid {amount} 💰
                </Button>
              ))}
            </div>
            <Button onClick={skip} variant="outline" className="w-full">Skip This Item</Button>
            <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto space-y-1">{log.slice(-4).map((l, i) => <div key={i}>{l}</div>)}</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center space-y-4">
            <p className="text-3xl font-bold">{profit >= 100 ? '🏆 Master Dealer!' : profit > 0 ? '📈 Profitable!' : '📉 Lost Money'}</p>
            <p className="text-xl">Total Profit: {profit}</p>
            <Button onClick={() => setPhase('lobby')}>New Auction</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BullAuction;
