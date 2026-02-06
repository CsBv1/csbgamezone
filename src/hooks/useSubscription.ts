import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionInfo {
  subscribed: boolean;
  tier: string | null;
  bulls: number;
  buff: number;
  subscriptionEnd: string | null;
  loading: boolean;
}

export const SUBSCRIPTION_TIERS = {
  tier1: {
    name: 'Tier 1',
    bulls: 1,
    buff: 10,
    price: 5,
    color: '#00D4FF'
  },
  tier2: {
    name: 'Tier 2', 
    bulls: 4,
    buff: 40,
    price: 15,
    color: '#9933FF'
  },
  tier3: {
    name: 'Tier 3',
    bulls: 10,
    buff: 100,
    price: 30,
    color: '#FFD700'
  }
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    tier: null,
    bulls: 0,
    buff: 0,
    subscriptionEnd: null,
    loading: true
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        tier: data.tier || null,
        bulls: data.bulls || 0,
        buff: data.buff || 0,
        subscriptionEnd: data.subscription_end || null,
        loading: false
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const subscribe = useCallback(async (tier: 'tier1' | 'tier2' | 'tier3') => {
    // Check auth first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please log in first to subscribe!');
      return;
    }

    toast.loading('Opening Stripe checkout...', { id: 'checkout' });

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { tier }
      });

      toast.dismiss('checkout');

      if (error || data?.error) {
        toast.error(error?.message || data?.error || 'Failed to create checkout');
        return;
      }

      if (data?.url) {
        // Direct redirect - most reliable method
        window.location.href = data.url;
      } else {
        toast.error('No checkout URL received');
      }
    } catch (err) {
      toast.dismiss('checkout');
      toast.error('Network error - please try again');
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Check URL params for subscription success
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast.success('🎉 Subscription activated! Welcome to the Holders Club!');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription]);

  return {
    ...subscription,
    checkSubscription,
    subscribe
  };
}
