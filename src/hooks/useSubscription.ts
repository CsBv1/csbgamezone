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
    console.log('[SUBSCRIBE] Starting subscription for tier:', tier);
    
    // CRITICAL: Open popup IMMEDIATELY on user click to avoid popup blocker
    const checkoutWindow = window.open('about:blank', '_blank', 'width=600,height=700,scrollbars=yes');
    
    if (!checkoutWindow) {
      toast.error('Popup blocked! Please allow popups for this site and try again.');
      return;
    }
    
    // Show loading message in the popup
    checkoutWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading Stripe Checkout...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              flex-direction: column;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 3px solid rgba(255,255,255,0.3);
              border-top-color: #00D4FF;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h2 { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>🐂 Loading Stripe Checkout...</h2>
          <p>Please wait while we prepare your subscription.</p>
        </body>
      </html>
    `);
    checkoutWindow.document.close();
    
    toast.loading('Preparing checkout...', { id: 'stripe-checkout' });

    try {
      // Use supabase.functions.invoke which automatically handles auth headers
      console.log('[SUBSCRIBE] Calling create-subscription via supabase.functions.invoke');
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { tier }
      });

      console.log('[SUBSCRIBE] Response:', data, 'Error:', error);

      if (error) {
        console.error('[SUBSCRIBE] Function error:', error);
        toast.dismiss('stripe-checkout');
        toast.error(`Subscription error: ${error.message || 'Unknown error'}`);
        if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
        return;
      }

      if (data?.error) {
        console.error('[SUBSCRIBE] Data error:', data.error);
        toast.dismiss('stripe-checkout');
        toast.error(`Subscription error: ${data.error}`);
        if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
        return;
      }

      if (data?.url) {
        console.log('[SUBSCRIBE] Redirecting popup to Stripe URL:', data.url);
        toast.dismiss('stripe-checkout');
        toast.success('Opening Stripe checkout!');
        
        // Redirect the popup to Stripe
        checkoutWindow.location.href = data.url;
      } else {
        console.error('[SUBSCRIBE] No URL returned:', data);
        toast.dismiss('stripe-checkout');
        toast.error('Failed to create checkout session - no URL returned');
        if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      }
    } catch (err) {
      console.error('[SUBSCRIBE] Exception:', err);
      toast.dismiss('stripe-checkout');
      toast.error('Network error - please try again');
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
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
