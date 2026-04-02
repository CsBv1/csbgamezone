import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WalletInfo {
  walletName: string;
  address: string;
  nickname: string;
}

interface CardanoWalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getRewardAddresses(): Promise<string[]>;
  getBalance(): Promise<string>;
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;
  signTx(tx: string, partialSign: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

interface CardanoWallet {
  name: string;
  icon: string;
  apiVersion: string;
  enable(): Promise<CardanoWalletApi>;
  isEnabled(): Promise<boolean>;
}

declare global {
  interface Window {
    cardano?: {
      [key: string]: CardanoWallet;
    };
  }
}

const WALLET_STORAGE_KEY = 'cardano_wallet_session';

export const useCardanoWallet = () => {
  const [connectedWallet, setConnectedWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [hasSession, setHasSession] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check Lovable Cloud auth session on mount and hydrate wallet info
  useEffect(() => {
    const hydrateFromProfile = async (userId: string, email?: string | null) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_address,wallet_name,username')
          .eq('id', userId)
          .single();

        const derivedAddress = email && email.endsWith('@cardano.wallet')
          ? email.split('@')[0]
          : undefined;

        if (profile?.wallet_address || derivedAddress) {
          const walletInfo: WalletInfo = {
            walletName: profile?.wallet_name || 'Cardano Wallet',
            address: (profile?.wallet_address as string) || (derivedAddress as string),
            nickname: profile?.username || 'Player',
          };
          localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletInfo));
          setConnectedWallet(walletInfo);
        }
      } catch (e) {
        console.error('Failed to hydrate wallet from profile', e);
      }
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setHasSession(true);
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (stored) {
          try {
            const walletInfo = JSON.parse(stored);
            setConnectedWallet(walletInfo);
          } catch (error) {
            console.error('Failed to parse stored wallet info:', error);
            localStorage.removeItem(WALLET_STORAGE_KEY);
            await hydrateFromProfile(session.user.id, session.user.email);
          }
        } else {
          await hydrateFromProfile(session.user.id, session.user.email);
        }
      } else {
        setHasSession(false);
        setConnectedWallet(null);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      }
      setIsReady(true);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setHasSession(false);
        setConnectedWallet(null);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      } else if (event === 'SIGNED_IN' && session) {
        setHasSession(true);
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (stored) {
          try {
            const walletInfo = JSON.parse(stored);
            setConnectedWallet(walletInfo);
          } catch (error) {
            console.error('Failed to parse stored wallet info:', error);
          }
        } else {
          // Hydrate from profile on first sign-in on a device
          setTimeout(() => {
            hydrateFromProfile(session.user.id, session.user.email);
          }, 0);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      if (typeof window === 'undefined' || !window.cardano) {
        setAvailableWallets([]);
        return;
      }

      const wallets = Object.keys(window.cardano).filter(key => {
        try {
          const wallet = window.cardano![key];
          return wallet && typeof wallet === 'object' && typeof wallet.enable === 'function';
        } catch {
          return false;
        }
      });

      setAvailableWallets(wallets);
    };

    detectWallets();
    // Re-check periodically in case wallets are installed
    const interval = setInterval(detectWallets, 2000);
    return () => clearInterval(interval);
  }, []);

  const connectWallet = useCallback(async (walletName: string, nickname: string) => {
    setIsConnecting(true);
    try {
      if (!window.cardano || !window.cardano[walletName]) {
        throw new Error(`Wallet ${walletName} not found`);
      }

      const walletApi = await window.cardano[walletName].enable();
      const addressHex = await walletApi.getChangeAddress();
      
      // Convert hex address to bech32 if needed (basic handling)
      const address = addressHex;

      const walletInfo: WalletInfo = {
        walletName,
        address,
        nickname,
      };

      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletInfo));
      setConnectedWallet(walletInfo);
      
      return walletInfo;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    setConnectedWallet(null);
  }, []);

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return {
    connectedWallet,
    isConnecting,
    availableWallets,
    connectWallet,
    disconnectWallet,
    shortenAddress,
    isConnected: hasSession || !!connectedWallet,
    isReady,
  };
};
