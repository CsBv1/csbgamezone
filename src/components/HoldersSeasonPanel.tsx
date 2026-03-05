import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Gem, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveSeason {
  id: string;
  name: string;
  ends_at: string;
  weekly_summary: string | null;
}

interface SeasonStanding {
  user_id: string;
  points: number;
  diamonds_earned: number;
  games_played: number;
}

export function HoldersSeasonPanel() {
  const [season, setSeason] = useState<ActiveSeason | null>(null);
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSeason = async () => {
      try {
        const nowIso = new Date().toISOString();

        const { data: activeSeason } = await supabase
          .from("holder_seasons" as any)
          .select("id, name, ends_at, weekly_summary")
          .eq("is_active", true)
          .gt("ends_at", nowIso)
          .order("starts_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!activeSeason) {
          setSeason(null);
          setStandings([]);
          return;
        }

        const normalizedSeason = activeSeason as unknown as ActiveSeason;
        setSeason(normalizedSeason);

        const { data: pointsData } = await supabase
          .from("holder_season_points" as any)
          .select("user_id, points, diamonds_earned, games_played")
          .eq("season_id", (activeSeason as any).id)
          .order("points", { ascending: false })
          .limit(10);

        const topRows = ((pointsData || []) as unknown) as SeasonStanding[];
        setStandings(topRows);

        const ids = topRows.map((row) => row.user_id);
        if (ids.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", ids);

          const map: Record<string, string> = {};
          (profileData || []).forEach((profile: any) => {
            map[profile.id] = profile.username || `Player_${profile.id.slice(0, 6)}`;
          });
          setUsernames(map);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSeason();
  }, []);

  const timeLeft = useMemo(() => {
    if (!season) return "No active season";
    const end = new Date(season.ends_at).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h left`;
  }, [season]);

  return (
    <Card className="p-5 bg-card/80 border-2 border-primary/30">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Holders Season</h3>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading season data...</p>
      ) : !season ? (
        <p className="text-sm text-muted-foreground">No active season yet. Weekly automation will open one automatically.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-foreground">{season.name}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Timer className="w-4 h-4" /> {timeLeft}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {season.weekly_summary || "Earn diamonds in games to climb the holder season ladder and bank keys."}
          </p>

          <div className="space-y-2">
            {standings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores yet this week — be the first to post points.</p>
            ) : (
              standings.map((entry, index) => (
                <div key={`${entry.user_id}-${index}`} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">#{index + 1} {usernames[entry.user_id] || "Holder"}</p>
                    <p className="text-xs text-muted-foreground">{entry.games_played} games • {entry.diamonds_earned} 💎</p>
                  </div>
                  <p className="font-bold text-primary">{entry.points} pts</p>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Gem className="w-3 h-3" /> Season points auto-sync from diamond wins.
          </p>
        </div>
      )}
    </Card>
  );
}
