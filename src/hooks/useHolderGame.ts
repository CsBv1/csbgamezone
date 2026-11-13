import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/hooks/useAudioManager";

interface UseHolderGameOptions {
  gameName: string;
  requireBulls?: boolean;
}

export function useHolderGame({ gameName, requireBulls = true }: UseHolderGameOptions) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bullsOwned, setBullsOwned] = useState(0);
  const [subscriptionBulls, setSubscriptionBulls] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login", variant: "destructive" });
        navigate('/');
        return;
      }
      
      setUserId(user.id);
      
      // Get NFT bulls owned
      const { data: nftData } = await supabase
        .from('user_nft_bonuses')
        .select('bulls_owned')
        .eq('user_id', user.id)
        .single();
      
      const bulls = (nftData as any)?.bulls_owned || 0;
      setBullsOwned(bulls);
      
      // Check subscription bulls
      let subBulls = 0;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: subData } = await supabase.functions.invoke('check-subscription', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          subBulls = subData?.bulls || 0;
          setSubscriptionBulls(subBulls);
        }
      } catch (e) {
        console.log('[HolderGame] Error checking subscription:', e);
      }
      
      const totalBulls = bulls + subBulls;
      
      if (requireBulls && totalBulls === 0) {
        toast({ 
          title: "🔒 Holders Only", 
          description: "You need to hold a CSB Bull NFT or subscribe to access this game!", 
          variant: "destructive" 
        });
        navigate('/');
        return;
      }
      
      // Play sound when entering game
      audioManager.playSFX('buttonPress');
      
      setIsAuthorized(true);
      setIsLoading(false);
    };
    
    init();
  }, [navigate, toast, requireBulls]);

  const saveKeysToWallet = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId || amount <= 0) return false;
    const { data, error } = await supabase.rpc('award_holder_keys' as any, { _game: gameName, _amount: amount });
    if (error) {
      toast({ title: "Keys not saved", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: `+${(data as any)?.awarded ?? amount} 🔑 added!`, description: `Won in ${gameName}` });
    return true;
  }, [userId, gameName, toast]);

  const awardKeys = useCallback(async (amount: number): Promise<boolean> => {
    if (amount <= 0) return false;
    
    console.log('[Keys] Awarding keys:', amount);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
    
    const success = await saveKeysToWallet(amount);
    
    if (!success) {
      toast({ title: `Earned ${amount} 🔑`, description: "But failed to save - please report this!", variant: "destructive" });
    }
    
    return success;
  }, [saveKeysToWallet, toast]);

  // Total bulls = wallet + subscription
  const totalBulls = bullsOwned + subscriptionBulls;

  return {
    userId,
    isLoading,
    bullsOwned,
    subscriptionBulls,
    totalBulls,
    isAuthorized,
    awardKeys,
    navigate,
    toast,
  };
}
