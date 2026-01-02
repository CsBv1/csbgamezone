import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGameLogic = (gameName: string) => {
  const [credits, setCredits] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCredits, setInitialCredits] = useState(0);
  const [rarityBonus, setRarityBonus] = useState(0);
  const [bullsOwned, setBullsOwned] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);

      // Load credits
      const { data: creditsData } = await supabase
        .from('user_credits' as any)
        .select('balance')
        .eq('user_id', session.user.id)
        .single();

      if (creditsData as any) {
        const balance = (creditsData as any).balance;
        setCredits(balance);
        setInitialCredits(balance);
      }

      // Load diamonds
      const { data: diamondsData } = await supabase
        .from('user_diamonds' as any)
        .select('balance')
        .eq('user_id', session.user.id)
        .single();

      if (diamondsData as any) {
        setDiamonds((diamondsData as any).balance);
      }

      // Load NFT bonuses
      const { data: nftData } = await supabase
        .from('user_nft_bonuses' as any)
        .select('rarity_bonus, bulls_owned')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (nftData) {
        setRarityBonus(Number((nftData as any).rarity_bonus) || 0);
        setBullsOwned((nftData as any).bulls_owned || 0);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    if (credits < amount) {
      toast.error('Not enough credits!');
      return false;
    }

    try {
      const newBalance = credits - amount;
      const { error } = await supabase
        .from('user_credits' as any)
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (error) throw error;

      setCredits(newBalance);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  };

  const awardDiamonds = async (amount: number, multiplier: number = 1.0) => {
    if (!userId || amount <= 0) return;

    try {
      const { data: currentData } = await supabase
        .from('user_diamonds' as any)
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (!currentData) return;

      // Apply NFT rarity bonus to diamond earnings
      const bonusMultiplier = 1 + (rarityBonus / 100);
      const finalAmount = Math.floor(amount * bonusMultiplier);

      const newBalance = (currentData as any).balance + finalAmount;
      const newTotal = (currentData as any).total_earned + finalAmount;

      const { error } = await supabase
        .from('user_diamonds' as any)
        .update({ 
          balance: newBalance,
          total_earned: newTotal 
        })
        .eq('user_id', userId);

      if (error) throw error;

      setDiamonds(newBalance);

      // Record game result
      await supabase
        .from('game_results' as any)
        .insert({
          user_id: userId,
          game_name: gameName,
          result: 'win',
          diamonds_won: finalAmount,
          multiplier: multiplier * bonusMultiplier
        });

      const bonusText = rarityBonus > 0 ? ` (+${rarityBonus}% NFT bonus!)` : '';
      toast.success(`🐂 Won ${finalAmount} diamonds!${bonusText}`);
    } catch (error) {
      console.error('Error awarding diamonds:', error);
    }
  };

  const awardCredits = async (amount: number) => {
    if (!userId || amount <= 0) return;

    try {
      const { data: currentData } = await supabase
        .from('user_credits' as any)
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (!currentData) return;

      // Apply NFT bonus to credit winnings too
      const bonusMultiplier = 1 + (rarityBonus / 100);
      const finalAmount = Math.floor(amount * bonusMultiplier);

      const newBalance = (currentData as any).balance + finalAmount;

      const { error } = await supabase
        .from('user_credits' as any)
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (error) throw error;

      setCredits(newBalance);

      // Record game result
      await supabase
        .from('game_results' as any)
        .insert({
          user_id: userId,
          game_name: gameName,
          result: 'win',
          credits_spent: 0,
          diamonds_won: 0
        });

      const bonusText = rarityBonus > 0 ? ` (+${rarityBonus}% NFT bonus!)` : '';
      toast.success(`💰 Won ${finalAmount} credits!${bonusText}`);
    } catch (error) {
      console.error('Error awarding credits:', error);
    }
  };

  const recordLoss = async (creditsSpent: number) => {
    if (!userId) return;

    try {
      await supabase
        .from('game_results' as any)
        .insert({
          user_id: userId,
          game_name: gameName,
          result: 'loss',
          credits_spent: creditsSpent,
          diamonds_won: 0
        });
    } catch (error) {
      console.error('Error recording loss:', error);
    }
  };

  const returnExcessCredits = async (currentCredits: number) => {
    if (!userId) return;
    
    const creditGain = currentCredits - initialCredits;
    if (creditGain > 0) {
      try {
        const { data: creditsData } = await supabase
          .from('user_credits' as any)
          .select('balance')
          .eq('user_id', userId)
          .single();

        if (creditsData as any) {
          const newBalance = (creditsData as any).balance + creditGain;
          
          const { error } = await supabase
            .from('user_credits' as any)
            .update({ balance: newBalance })
            .eq('user_id', userId);

          if (error) throw error;

          toast.success(`🎉 Returned ${creditGain} credits to your wallet!`);
        }
      } catch (error) {
        console.error('Error returning credits:', error);
      }
    }
  };

  return {
    credits,
    diamonds,
    loading,
    initialCredits,
    rarityBonus,
    bullsOwned,
    deductCredits,
    awardCredits,
    awardDiamonds,
    recordLoss,
    refreshData: loadUserData,
    returnExcessCredits
  };
};