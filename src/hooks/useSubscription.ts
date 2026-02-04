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
      console.log('[SUBSCRIBE] Starting subscription for tier:', tier);
      toast.loading('Opening Stripe checkout...', { id: 'stripe-checkout' });

      // First, try to refresh the session to get a fresh token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      let accessToken: string | undefined;
      let userEmail: string | undefined;
      
      if (refreshError || !refreshData.session) {
        console.log('[SUBSCRIBE] Refresh failed, trying getSession:', refreshError?.message);
        // Fallback to getSession
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session?.access_token) {
          console.error('[SUBSCRIBE] No valid session found');
          toast.dismiss('stripe-checkout');
          toast.error('Please connect your wallet first to subscribe');
          return;
        }
        
        accessToken = sessionData.session.access_token;
        userEmail = sessionData.session.user?.email;
      } else {
        accessToken = refreshData.session.access_token;
        userEmail = refreshData.session.user?.email;
      }

      console.log('[SUBSCRIBE] Session user:', userEmail);
      console.log('[SUBSCRIBE] Token length:', accessToken?.length);

      // Make the API call with explicit authorization header
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({ tier })
        }
      );

      const data = await response.json();
      console.log('[SUBSCRIBE] Response:', data);

      if (!response.ok) {
        console.error('[SUBSCRIBE] API Error:', data);
        toast.dismiss('stripe-checkout');
        toast.error(`Subscription error: ${data.error || 'Unknown error'}`);
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
        // Open checkout in new tab
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
