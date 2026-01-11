import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gem, Coins, Key, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const CreditBar = () => {
  const [credits, setCredits] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [keys, setKeys] = useState(0);
  const [bukals, setBukals] = useState(0);
  const [bullsOwned, setBullsOwned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        fetchBalances();
      } else {
        setIsAuthenticated(false);
        setCredits(0);
        setDiamonds(0);
        setKeys(0);
        setBukals(0);
        setBullsOwned(0);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      fetchBalances();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const creditsChannel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_credits' },
        () => fetchBalances()
      )
      .subscribe();

    const diamondsChannel = supabase
      .channel('diamonds-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_diamonds' },
        () => fetchBalances()
      )
      .subscribe();

    const nftChannel = supabase
      .channel('nft-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_nft_bonuses' },
        () => fetchBalances()
      )
      .subscribe();

    const bukalsChannel = supabase
      .channel('bukals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_bukals' },
        () => fetchBalances()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(diamondsChannel);
      supabase.removeChannel(nftChannel);
      supabase.removeChannel(bukalsChannel);
    };
  }, [isAuthenticated]);

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [creditsResult, diamondsResult, keysResult, bukalsResult, nftResult] = await Promise.all([
        supabase.from('user_credits' as any).select('balance').eq('user_id', user.id).single(),
        supabase.from('user_diamonds' as any).select('balance').eq('user_id', user.id).single(),
        supabase.from('user_keys' as any).select('balance').eq('user_id', user.id).single(),
        supabase.from('user_bukals' as any).select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_nft_bonuses' as any).select('bulls_owned').eq('user_id', user.id).maybeSingle()
      ]);

      if ((creditsResult as any).data) setCredits((creditsResult as any).data.balance);
      if ((diamondsResult as any).data) setDiamonds((diamondsResult as any).data.balance);
      if ((keysResult as any).data) setKeys((keysResult as any).data.balance);
      if ((bukalsResult as any).data) setBukals((bukalsResult as any).data.balance);
      if ((nftResult as any).data) setBullsOwned((nftResult as any).data.bulls_owned);
    } catch (error: any) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const rescanWallet = async () => {
    setIsScanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single();

      if (!profile?.wallet_address) {
        toast({ title: "No wallet connected", variant: "destructive" });
        return;
      }

      console.log("Rescanning wallet:", profile.wallet_address);

      const { data, error } = await supabase.functions.invoke('scan-wallet-nfts', {
        body: { walletAddress: profile.wallet_address }
      });

      console.log("Rescan result:", data);

      if (error) throw error;

      if (data) {
        await supabase.from('user_nft_bonuses' as any).upsert({
          user_id: user.id,
          bulls_owned: data.bullsOwned || 0,
          rarity_bonus: data.rarityBonus || 0,
          highest_rarity: data.highestRarity || 'none',
          last_scanned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        setBullsOwned(data.bullsOwned || 0);
        toast({
          title: `Wallet scanned`,
          description: `Found ${data.bullsOwned} CSB Bulls${data.bullsOwned > 0 ? ` (+${data.rarityBonus}% bonus)` : ''}`
        });
      }
    } catch (error: any) {
      console.error('Rescan error:', error);
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-card/80 backdrop-blur-sm border border-primary/30 rounded-lg">
        <div className="animate-pulse flex gap-2">
          <div className="h-4 w-12 bg-muted rounded"></div>
          <div className="h-4 w-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-card/90 to-primary/10 backdrop-blur-sm border border-primary/40 rounded-lg text-xs">
      <div className="flex items-center gap-1">
        <Coins className="w-3 h-3 text-yellow-500" />
        <span className="font-bold">{credits}</span>
      </div>
      <div className="h-3 w-px bg-border/50"></div>
      <div className="flex items-center gap-1">
        <span className="text-sm">🏆</span>
        <span className="font-bold text-yellow-400">{bukals}</span>
      </div>
      <div className="h-3 w-px bg-border/50"></div>
      <div className="flex items-center gap-1">
        <Key className="w-3 h-3 text-amber-500" />
        <span className="font-bold">{keys}</span>
      </div>
      <div className="h-3 w-px bg-border/50"></div>
      <div className="flex items-center gap-1">
        <Gem className="w-3 h-3 text-cyan-400" />
        <span className="font-bold">{diamonds}</span>
      </div>
      <div className="h-3 w-px bg-border/50"></div>
      <div className="flex items-center gap-1">
        <span className="text-sm">🐂</span>
        <span className="font-bold text-amber-400">{bullsOwned}</span>
        <button
          onClick={rescanWallet}
          disabled={isScanning}
          className="p-0.5 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
          title="Rescan wallet for NFTs"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${isScanning ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
