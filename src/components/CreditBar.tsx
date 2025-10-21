import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Gem, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const CreditBar = () => {
  const [credits, setCredits] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

    // Subscribe to real-time updates only if authenticated
    const creditsChannel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits'
        },
        () => fetchBalances()
      )
      .subscribe();

    const diamondsChannel = supabase
      .channel('diamonds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_diamonds'
        },
        () => fetchBalances()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(diamondsChannel);
    };
  }, [isAuthenticated]);

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [creditsResult, diamondsResult] = await Promise.all([
        supabase
          .from('user_credits' as any)
          .select('balance')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_diamonds' as any)
          .select('balance')
          .eq('user_id', user.id)
          .single()
      ]);

      if ((creditsResult as any).data) setCredits((creditsResult as any).data.balance);
      if ((diamondsResult as any).data) setDiamonds((diamondsResult as any).data.balance);
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      toast({
        title: "Error",
        description: "Failed to load balances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center gap-6 px-6 py-3 bg-card/80 backdrop-blur-sm border-primary/30">
        <div className="animate-pulse flex gap-4">
          <div className="h-6 w-24 bg-muted rounded"></div>
          <div className="h-6 w-24 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't show credit bar if not authenticated
  }

  return (
    <Card className="flex items-center gap-6 px-6 py-3 bg-gradient-to-r from-card/90 to-primary/10 backdrop-blur-sm border-2 border-primary/40 shadow-lg">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-yellow-500" />
        <div>
          <p className="text-xs text-muted-foreground">Credits</p>
          <p className="text-lg font-bold text-foreground">{credits}</p>
        </div>
      </div>
      <div className="h-8 w-px bg-border"></div>
      <div className="flex items-center gap-2">
        <Gem className="w-5 h-5 text-cyan-400" />
        <div>
          <p className="text-xs text-muted-foreground">Diamonds</p>
          <p className="text-lg font-bold gradient-gold bg-clip-text text-transparent">{diamonds} 💎</p>
        </div>
      </div>
    </Card>
  );
};