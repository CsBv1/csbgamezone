import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Gem, Trophy, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  total_diamonds: number;
  total_wins: number;
  total_games: number;
  user_id?: string;
}

interface UserColor {
  user_id: string;
  color_value: string;
  active: boolean;
}

interface UserNFTBonus {
  user_id: string;
  bulls_owned: number;
}

interface UserBukal {
  user_id: string;
  balance: number;
}

interface UserBadge {
  user_id: string;
  badge_name: string;
  badge_color: string;
  active: boolean;
}

interface UserRune {
  user_id: string;
  rune_name: string;
  rune_symbol: string;
  active: boolean;
}

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  const [userBulls, setUserBulls] = useState<Record<string, number>>({});
  const [userBukals, setUserBukals] = useState<Record<string, number>>({});
  const [userBadges, setUserBadges] = useState<Record<string, { name: string; color: string }>>({});
  const [userRunes, setUserRunes] = useState<Record<string, { name: string; symbol: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription for leaderboard updates
    const diamondsChannel = supabase
      .channel('diamonds-changes-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_diamonds'
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    const gameResultsChannel = supabase
      .channel('game-results-changes-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_results'
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    const cosmeticsChannel = supabase
      .channel('cosmetics-changes-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_runes' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_colors' }, () => fetchLeaderboard())
      .subscribe();

    return () => {
      supabase.removeChannel(diamondsChannel);
      supabase.removeChannel(gameResultsChannel);
      supabase.removeChannel(cosmeticsChannel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(100);

      if (error) throw error;
      
      setLeaderboard(data || []);
      
      // Fetch active colors for all users
      const { data: colorsData } = await supabase
        .from('user_colors' as any)
        .select('user_id, color_value, active')
        .eq('active', true);
      
      if (colorsData && Array.isArray(colorsData)) {
        const colorsMap: Record<string, string> = {};
        colorsData.forEach((color: any) => {
          colorsMap[color.user_id] = color.color_value;
        });
        setUserColors(colorsMap);
      }

      // Fetch NFT bonuses to see who holds bulls
      const { data: nftData } = await supabase
        .from('user_nft_bonuses')
        .select('user_id, bulls_owned');
      
      if (nftData && Array.isArray(nftData)) {
        const bullsMap: Record<string, number> = {};
        nftData.forEach((nft: any) => {
          if (nft.bulls_owned > 0) {
            bullsMap[nft.user_id] = nft.bulls_owned;
          }
        });
        setUserBulls(bullsMap);
      }

      // Fetch bukals to show on leaderboard
      const { data: bukalsData } = await supabase
        .from('user_bukals')
        .select('user_id, balance');
      
      if (bukalsData && Array.isArray(bukalsData)) {
        const bukalsMap: Record<string, number> = {};
        bukalsData.forEach((bukal: any) => {
          if (bukal.balance > 0) {
            bukalsMap[bukal.user_id] = bukal.balance;
          }
        });
        setUserBukals(bukalsMap);
      }

      // Fetch active badges to show on leaderboard
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('user_id, badge_name, badge_color, active')
        .eq('active', true);
      
      if (badgesData && Array.isArray(badgesData)) {
        const badgesMap: Record<string, { name: string; color: string }> = {};
        badgesData.forEach((badge: any) => {
          badgesMap[badge.user_id] = { name: badge.badge_name, color: badge.badge_color };
        });
        setUserBadges(badgesMap);
      }

      // Fetch active runes to show on leaderboard
      const { data: runesData } = await supabase
        .from('user_runes' as any)
        .select('user_id, rune_name, rune_symbol, active')
        .eq('active', true);
      
      if (runesData && Array.isArray(runesData)) {
        const runesMap: Record<string, { name: string; symbol: string }> = {};
        (runesData as any[]).forEach((rune: any) => {
          runesMap[rune.user_id] = { name: rune.rune_name, symbol: rune.rune_symbol };
        });
        setUserRunes(runesMap);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-foreground">Cardano Stake Bulls Leaderboard Most Diamond Hodl 💎</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h3 className="text-xl font-bold text-foreground">Cardano Stake Bulls Leaderboard Most Diamond Hodl 💎</h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No players yet. Be the first to earn diamonds! 💎
          </p>
        ) : (
          leaderboard.map((entry, index) => {
            const nextRank = leaderboard[index - 1];
            const diamondGap = nextRank ? nextRank.total_diamonds - entry.total_diamonds : 0;
            const isHolder = entry.user_id && userBulls[entry.user_id] > 0;
            const hasBukals = entry.user_id && userBukals[entry.user_id] > 0;
            const userBadge = entry.user_id ? userBadges[entry.user_id] : null;
            const userRune = entry.user_id ? userRunes[entry.user_id] : null;
            
            return (
              <div
                key={`${entry.username}-${entry.rank}`}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:scale-[1.02] relative overflow-hidden ${
                  entry.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                    : 'bg-background/50 border-border'
                } ${isHolder ? 'animate-pulse-glow border-amber-400' : ''}`}
              >
                {/* Holder glow overlay */}
                {isHolder && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
                )}
                <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                  {/* Rank with stacked Bukals/Bulls */}
                  <div className="flex flex-col items-center min-w-[3rem]">
                    {hasBukals && (
                      <span className="text-[10px] text-yellow-400 font-bold leading-tight">
                        🏆{userBukals[entry.user_id!]}
                      </span>
                    )}
                    <span className="text-lg font-bold">
                      {getMedalEmoji(entry.rank)}
                    </span>
                    {isHolder && (
                      <span className="text-[10px] text-amber-400 font-bold leading-tight">
                        🐂{userBulls[entry.user_id!]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-semibold truncate"
                      style={{ 
                        color: entry.user_id && userColors[entry.user_id] 
                          ? userColors[entry.user_id] 
                          : 'inherit',
                        textShadow: entry.user_id && userColors[entry.user_id]
                          ? `0 0 10px ${userColors[entry.user_id]}80`
                          : 'none'
                      }}
                    >
                      {entry.username}
                    </p>
                    <div className="flex items-center gap-1 text-xs flex-wrap">
                      {userBadge && (
                        <>
                          <Award className="w-3 h-3" style={{ color: userBadge.color }} />
                          <span className="font-medium" style={{ color: userBadge.color, textShadow: `0 0 6px ${userBadge.color}40` }}>
                            {userBadge.name}
                          </span>
                        </>
                      )}
                      {userBadge && userRune && <span className="mx-0.5" />}
                      {userRune && (
                        <span className="inline-flex items-center gap-1 font-semibold rune-neon">
                          <span className="rune-neon-symbol">{userRune.symbol}</span>
                          <span>{userRune.name}</span>
                        </span>
                      )}
                      {!userBadge && !userRune && (
                        <span className="text-muted-foreground">{entry.total_wins} wins • {entry.total_games} games</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 relative z-10">
                  <div className="flex items-center gap-1 mb-1">
                    <Gem className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold gradient-gold bg-clip-text text-transparent">
                      {entry.total_diamonds} 💎
                    </span>
                  </div>
                  {diamondGap > 0 && (
                    <p className="text-xs text-muted-foreground">
                      -{diamondGap} to next
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};