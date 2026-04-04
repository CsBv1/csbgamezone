import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, Gem, ShoppingCart, Loader2, Sparkles } from 'lucide-react';

interface UserBadge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_color: string;
  diamond_cost: number;
  active: boolean;
}

// 12 CSB Ambassador Badges - same as BadgeSelectorDialog
const AMBASSADOR_BADGES = [
  { id: 'csb_legendary_gold', name: 'Legendary Gold', color: '#FFD700', cost: 50000, tier: 'Legendary' },
  { id: 'csb_legendary_platinum', name: 'Legendary Platinum', color: '#E5E4E2', cost: 40000, tier: 'Legendary' },
  { id: 'csb_legendary_diamond', name: 'Legendary Diamond', color: '#B9F2FF', cost: 30000, tier: 'Legendary' },
  { id: 'csb_epic_ruby', name: 'Epic Ruby', color: '#E0115F', cost: 20000, tier: 'Epic' },
  { id: 'csb_epic_emerald', name: 'Epic Emerald', color: '#50C878', cost: 15000, tier: 'Epic' },
  { id: 'csb_epic_sapphire', name: 'Epic Sapphire', color: '#0F52BA', cost: 10000, tier: 'Epic' },
  { id: 'csb_rare_amethyst', name: 'Rare Amethyst', color: '#9966CC', cost: 7500, tier: 'Rare' },
  { id: 'csb_rare_topaz', name: 'Rare Topaz', color: '#FFC87C', cost: 5000, tier: 'Rare' },
  { id: 'csb_rare_jade', name: 'Rare Jade', color: '#00A86B', cost: 3000, tier: 'Rare' },
  { id: 'csb_uncommon_bronze', name: 'Uncommon Bronze', color: '#CD7F32', cost: 2000, tier: 'Uncommon' },
  { id: 'csb_uncommon_silver', name: 'Uncommon Silver', color: '#C0C0C0', cost: 1000, tier: 'Uncommon' },
  { id: 'csb_common_copper', name: 'Common Copper', color: '#B87333', cost: 500, tier: 'Common' },
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

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Legendary': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
    case 'Epic': return 'from-purple-500/20 to-pink-500/20 border-purple-500/50';
    case 'Rare': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/50';
    case 'Uncommon': return 'from-green-500/20 to-emerald-500/20 border-green-500/50';
    default: return 'from-gray-500/20 to-slate-500/20 border-gray-500/50';
  }
};

export function BadgeMarketplace() {
  const [ownedBadges, setOwnedBadges] = useState<UserBadge[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      // Fetch owned badges and diamonds in parallel
      const [badgesResult, diamondsResult] = await Promise.all([
        supabase.from('user_badges').select('*').eq('user_id', user.id),
        supabase.from('user_diamonds').select('balance').eq('user_id', user.id).single()
      ]);

      if (badgesResult.data) {
        setOwnedBadges(badgesResult.data as UserBadge[]);
        const active = (badgesResult.data as UserBadge[]).find(b => b.active);
        if (active) setActiveBadgeId(active.id);
      }

      setUserDiamonds(diamondsResult.data?.balance || 0);
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
      setUserDiamonds(newBalance);
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
      setActiveBadgeId(badgeId);
      fetchData();
    } catch (error) {
      console.error('Error activating badge:', error);
      toast.error("Failed to equip badge");
    }
  };

  const ownedBadgeIds = new Set(ownedBadges.map(b => b.badge_id));

  // Group badges by tier
  const badgesByTier = AMBASSADOR_BADGES.reduce((acc, badge) => {
    if (!acc[badge.tier]) acc[badge.tier] = [];
    acc[badge.tier].push(badge);
    return acc;
  }, {} as Record<string, typeof AMBASSADOR_BADGES>);

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-[#0d2137] to-[#1a3a4a] border-[#00D4FF]/30">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#00D4FF]" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-[#0d2137] to-[#1a3a4a] border-[#00D4FF]/30">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          CSB Badge Marketplace
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </h2>
        <p className="text-[#00D4FF]/60 text-sm mt-1">Collect all 12 legendary Ambassador Badges!</p>
      </div>

      {/* Diamond Balance */}
      <div className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-black/30 border border-[#00D4FF]/20">
        <Gem className="w-5 h-5 text-cyan-400" />
        <span className="text-white font-bold">{formatDiamondCost(userDiamonds)} 💎</span>
        <span className="text-[#00D4FF]/60 text-sm">• {ownedBadges.length}/12 Badges Owned</span>
      </div>

      {/* Badge Grid by Tier */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'].map(tier => {
          const tierBadges = badgesByTier[tier];
          if (!tierBadges) return null;

          return (
            <div key={tier}>
              <h3 className={`text-sm font-bold mb-2 ${
                tier === 'Legendary' ? 'text-yellow-400' :
                tier === 'Epic' ? 'text-purple-400' :
                tier === 'Rare' ? 'text-blue-400' :
                tier === 'Uncommon' ? 'text-green-400' :
                'text-gray-400'
              }`}>
                {tier} Badges
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tierBadges.map((badge) => {
                  const isOwned = ownedBadgeIds.has(badge.id);
                  const ownedBadge = ownedBadges.find(b => b.badge_id === badge.id);
                  const isActive = ownedBadge?.id === activeBadgeId;
                  const canAfford = userDiamonds >= badge.cost;

                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-lg border-2 transition-all bg-gradient-to-br ${getTierColor(tier)} ${
                        isActive ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#0d2137]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Award 
                          className="w-8 h-8" 
                          style={{ 
                            color: badge.color,
                            filter: `drop-shadow(0 0 6px ${badge.color}80)`
                          }} 
                        />
                        <div className="flex-1 min-w-0">
                          <p 
                            className="font-bold text-sm truncate"
                            style={{ 
                              color: badge.color,
                              textShadow: `0 0 8px ${badge.color}60`
                            }}
                          >
                            {badge.name}
                          </p>
                          <p className="text-xs text-white/60">{tier}</p>
                        </div>
                      </div>

                      {isOwned ? (
                        <Button
                          size="sm"
                          variant={isActive ? "secondary" : "outline"}
                          className={`w-full ${isActive ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' : ''}`}
                          onClick={() => ownedBadge && activateBadge(ownedBadge.id)}
                        >
                          {isActive ? '✓ Equipped' : 'Equip Badge'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={canAfford ? "default" : "outline"}
                          disabled={!canAfford || purchasing === badge.id}
                          onClick={() => purchaseBadge(badge)}
                          className={`w-full gap-1 ${canAfford ? 'bg-gradient-to-r from-[#00D4FF] to-[#0095ff] text-black hover:from-[#00D4FF]/80 hover:to-[#0095ff]/80' : 'opacity-50'}`}
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-center text-[#00D4FF]/40 mt-4">
        Equipped badges appear on the global leaderboard! 🏆
      </p>
    </Card>
  );
}
