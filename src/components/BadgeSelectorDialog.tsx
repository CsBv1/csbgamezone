import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, Check, Loader2, Gem, ShoppingCart } from 'lucide-react';

interface UserBadge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_color: string;
  diamond_cost: number;
  active: boolean;
}

// 12 CSB Ambassador Badges with different colors and diamond costs
const AMBASSADOR_BADGES = [
  { id: 'csb_legendary_gold', name: 'Legendary Gold', color: '#FFD700', cost: 2000000000 }, // 2B
  { id: 'csb_legendary_platinum', name: 'Legendary Platinum', color: '#E5E4E2', cost: 1500000000 }, // 1.5B
  { id: 'csb_legendary_diamond', name: 'Legendary Diamond', color: '#B9F2FF', cost: 1000000000 }, // 1B
  { id: 'csb_epic_ruby', name: 'Epic Ruby', color: '#E0115F', cost: 500000000 }, // 500M
  { id: 'csb_epic_emerald', name: 'Epic Emerald', color: '#50C878', cost: 250000000 }, // 250M
  { id: 'csb_epic_sapphire', name: 'Epic Sapphire', color: '#0F52BA', cost: 100000000 }, // 100M
  { id: 'csb_rare_amethyst', name: 'Rare Amethyst', color: '#9966CC', cost: 50000000 }, // 50M
  { id: 'csb_rare_topaz', name: 'Rare Topaz', color: '#FFC87C', cost: 25000000 }, // 25M
  { id: 'csb_rare_jade', name: 'Rare Jade', color: '#00A86B', cost: 10000000 }, // 10M
  { id: 'csb_uncommon_bronze', name: 'Uncommon Bronze', color: '#CD7F32', cost: 5000000 }, // 5M
  { id: 'csb_uncommon_silver', name: 'Uncommon Silver', color: '#C0C0C0', cost: 1000000 }, // 1M
  { id: 'csb_common_copper', name: 'Common Copper', color: '#B87333', cost: 100000 }, // 100K
];

const formatDiamondCost = (cost: number): string => {
  if (cost >= 1000000000) {
    return `${(cost / 1000000000).toFixed(0)}B`;
  } else if (cost >= 1000000) {
    return `${(cost / 1000000).toFixed(0)}M`;
  } else if (cost >= 1000) {
    return `${(cost / 1000).toFixed(0)}K`;
  }
  return cost.toString();
};

export const BadgeSelectorDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [ownedBadges, setOwnedBadges] = useState<UserBadge[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Fetch owned badges
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      if (badgesError) throw badgesError;
      setOwnedBadges((badges as UserBadge[]) || []);

      // Fetch user diamonds
      const { data: diamonds } = await supabase
        .from('user_diamonds')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      setUserDiamonds(diamonds?.balance || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseBadge = async (badge: typeof AMBASSADOR_BADGES[0]) => {
    if (!userId) return;

    if (userDiamonds < badge.cost) {
      toast.error(`Not enough diamonds! Need ${formatDiamondCost(badge.cost)} 💎`);
      return;
    }

    setPurchasing(badge.id);
    try {
      // Deduct diamonds
      const newBalance = userDiamonds - badge.cost;
      const { error: diamondError } = await supabase
        .from('user_diamonds')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (diamondError) throw diamondError;

      // Add badge
      const { error: badgeError } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
          badge_name: badge.name,
          badge_color: badge.color,
          diamond_cost: badge.cost,
          active: false
        });

      if (badgeError) throw badgeError;

      toast.success(`🏆 ${badge.name} Badge purchased!`);
      fetchData();
    } catch (error) {
      console.error('Error purchasing badge:', error);
      toast.error("Failed to purchase badge");
    } finally {
      setPurchasing(null);
    }
  };

  const activateBadge = async (badgeId: string) => {
    if (!userId) return;

    try {
      // Deactivate all badges first
      await supabase
        .from('user_badges')
        .update({ active: false })
        .eq('user_id', userId);

      // Activate selected badge
      const { error } = await supabase
        .from('user_badges')
        .update({ active: true })
        .eq('id', badgeId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success("Badge equipped! 🏆");
      fetchData();
    } catch (error) {
      console.error('Error activating badge:', error);
      toast.error("Failed to equip badge");
    }
  };

  const deactivateBadge = async () => {
    if (!userId) return;

    try {
      await supabase
        .from('user_badges')
        .update({ active: false })
        .eq('user_id', userId);

      toast.success("Badge unequipped");
      fetchData();
    } catch (error) {
      console.error('Error deactivating badge:', error);
      toast.error("Failed to unequip badge");
    }
  };

  const activeBadge = ownedBadges.find(b => b.active);
  const ownedBadgeIds = new Set(ownedBadges.map(b => b.badge_id));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Award className="w-4 h-4" />
          CSB Badges
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            CSB Ambassador Badges
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span>Your Diamonds: {formatDiamondCost(userDiamonds)} 💎</span>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1">
            {activeBadge && (
              <Card className="p-3 bg-muted/50 border-2" style={{ borderColor: activeBadge.badge_color }}>
                <p className="text-sm text-muted-foreground mb-2">Currently Equipped:</p>
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6" style={{ color: activeBadge.badge_color }} />
                  <p 
                    className="font-bold text-lg"
                    style={{ 
                      color: activeBadge.badge_color,
                      textShadow: `0 0 10px ${activeBadge.badge_color}80`
                    }}
                  >
                    {activeBadge.badge_name}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={deactivateBadge}
                  className="w-full mt-2"
                >
                  Unequip Badge
                </Button>
              </Card>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {ownedBadges.length > 0 ? `Owned Badges (${ownedBadges.length}/12)` : 'Purchase Badges'}
              </h4>
              
              {/* Show owned badges first */}
              {ownedBadges.filter(b => !b.active).map((badge) => (
                <div
                  key={badge.id}
                  className="p-3 rounded-lg border-2 hover:scale-[1.02] transition-all cursor-pointer"
                  style={{ 
                    borderColor: 'transparent',
                    backgroundColor: `${badge.badge_color}15`
                  }}
                  onClick={() => activateBadge(badge.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" style={{ color: badge.badge_color }} />
                      <span 
                        className="font-semibold"
                        style={{ 
                          color: badge.badge_color,
                          textShadow: `0 0 8px ${badge.badge_color}60`
                        }}
                      >
                        {badge.badge_name}
                      </span>
                    </div>
                    <span className="text-xs text-green-500 font-medium">OWNED</span>
                  </div>
                </div>
              ))}

              {/* Available badges to purchase */}
              <h4 className="text-sm font-semibold text-muted-foreground mt-4">
                Available in Marketplace
              </h4>
              {AMBASSADOR_BADGES.filter(b => !ownedBadgeIds.has(b.id)).map((badge) => {
                const canAfford = userDiamonds >= badge.cost;
                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border-2 transition-all ${canAfford ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-50'}`}
                    style={{ 
                      borderColor: 'transparent',
                      backgroundColor: `${badge.color}10`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5" style={{ color: badge.color }} />
                        <span 
                          className="font-semibold"
                          style={{ 
                            color: badge.color,
                            textShadow: `0 0 8px ${badge.color}60`
                          }}
                        >
                          {badge.name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "outline"}
                        disabled={!canAfford || purchasing === badge.id}
                        onClick={() => purchaseBadge(badge)}
                        className="gap-1"
                      >
                        {purchasing === badge.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3" />
                            {formatDiamondCost(badge.cost)} 💎
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
