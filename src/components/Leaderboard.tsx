import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Gem, Trophy } from "lucide-react";
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

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  const [userBulls, setUserBulls] = useState<Record<string, number>>({});
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

    return () => {
      supabase.removeChannel(diamondsChannel);
      supabase.removeChannel(gameResultsChannel);
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
                  <span className="text-lg font-bold min-w-[3rem]">
                    {getMedalEmoji(entry.rank)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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
                      {isHolder && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/30 text-amber-300 rounded-full animate-pulse whitespace-nowrap">
                          🐂 {userBulls[entry.user_id!]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.total_wins} wins • {entry.total_games} games
                    </p>
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