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

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login first to subscribe');
        return;
      }

      console.log('[SUBSCRIBE] Starting subscription for tier:', tier);
      toast.loading('Opening Stripe checkout...', { id: 'stripe-checkout' });

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[SUBSCRIBE] Response:', { data, error });

      if (error) {
        console.error('[SUBSCRIBE] Error:', error);
        toast.dismiss('stripe-checkout');
        toast.error(`Subscription error: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data?.error) {
        console.error('[SUBSCRIBE] Data error:', data.error);
        toast.dismiss('stripe-checkout');
        toast.error(`Subscription error: ${data.error}`);
        return;
      }

      if (data?.url) {
        console.log('[SUBSCRIBE] Opening Stripe URL:', data.url);
        toast.dismiss('stripe-checkout');
        toast.success('Redirecting to Stripe checkout...');
        window.open(data.url, '_blank');
      } else {
        console.error('[SUBSCRIBE] No URL returned:', data);
        toast.dismiss('stripe-checkout');
        toast.error('Failed to create checkout session - no URL returned');
      }
    } catch (err) {
      console.error('[SUBSCRIBE] Exception:', err);
      toast.dismiss('stripe-checkout');
      toast.error('Failed to start subscription');
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Check URL params for subscription success
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast.success('🎉 Subscription activated! Welcome to the Holders Club!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Re-check subscription
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription]);

  return {
    ...subscription,
    checkSubscription,
    subscribe
  };
}
