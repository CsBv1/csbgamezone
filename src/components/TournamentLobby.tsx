import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Clock, Gem, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Tournament {
  id: string;
  name: string;
  status: string;
  round_number: number;
  max_players: number;
  prize_pool: number;
  started_at: string | null;
  player_count?: number;
}

interface TournamentPlayer {
  id: string;
  user_id: string;
  username: string | null;
  status: string;
  completion_time_ms: number | null;
}

interface TournamentLobbyProps {
  onJoinTournament: (tournamentId: string) => void;
  onStartRound: (tournamentId: string, roundNumber: number) => void;
}

export const TournamentLobby = ({ onJoinTournament, onStartRound }: TournamentLobbyProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Player");
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initUser();
    fetchTournaments();
    
    // Subscribe to tournament updates
    const channel = supabase
      .channel('tournament-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maze_tournaments' }, fetchTournaments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_players' }, () => {
        if (selectedTournament) fetchPlayers(selectedTournament.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTournament]);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (profile?.username) setUsername(profile.username);
    }
  };

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('maze_tournaments')
      .select('*')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });

    if (data) {
      // Get player counts for each tournament
      const tournamentsWithCounts = await Promise.all(
        data.map(async (t) => {
          const { count } = await supabase
            .from('tournament_players')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', t.id)
            .eq('status', 'active');
          return { ...t, player_count: count || 0 };
        })
      );
      setTournaments(tournamentsWithCounts);
    }
    setLoading(false);
  };

  const fetchPlayers = async (tournamentId: string) => {
    const { data } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active');

    if (data) {
      setPlayers(data);
      setIsJoined(data.some(p => p.user_id === userId));
    }
  };

  const createTournament = async () => {
    if (!userId) {
      toast.error('Please connect your wallet first');
      return;
    }

    const { data, error } = await supabase
      .from('maze_tournaments')
      .insert({
        name: `Bull Stampede Tournament #${Date.now().toString().slice(-4)}`,
        status: 'waiting',
        max_players: 8,
        prize_pool: 1000
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create tournament');
      return;
    }

    if (data) {
      toast.success('Tournament created!');
      setSelectedTournament(data);
      fetchPlayers(data.id);
    }
  };

  const joinTournament = async (tournament: Tournament) => {
    if (!userId) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (tournament.player_count && tournament.player_count >= tournament.max_players) {
      toast.error('Tournament is full!');
      return;
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('tournament_players')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      setSelectedTournament(tournament);
      fetchPlayers(tournament.id);
      setIsJoined(true);
      return;
    }

    const { error } = await supabase
      .from('tournament_players')
      .insert({
        tournament_id: tournament.id,
        user_id: userId,
        username: username,
        status: 'active'
      });

    if (error) {
      toast.error('Failed to join tournament');
      return;
    }

    toast.success('Joined tournament!');
    setSelectedTournament(tournament);
    fetchPlayers(tournament.id);
    setIsJoined(true);
  };

  const startTournament = async () => {
    if (!selectedTournament || players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    await supabase
      .from('maze_tournaments')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', selectedTournament.id);

    onStartRound(selectedTournament.id, 1);
  };

  const leaveTournament = async () => {
    if (!selectedTournament || !userId) return;

    await supabase
      .from('tournament_players')
      .update({ status: 'left' })
      .eq('tournament_id', selectedTournament.id)
      .eq('user_id', userId);

    setIsJoined(false);
    setSelectedTournament(null);
    toast.success('Left tournament');
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/80 border-primary/30">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (selectedTournament) {
    return (
      <Card className="p-6 bg-gradient-to-br from-card to-primary/10 border-2 border-primary/40">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">
              {selectedTournament.name}
            </h2>
            <Badge variant="outline" className="mt-2">
              Round {selectedTournament.round_number} • {selectedTournament.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-cyan-400" />
            <span className="text-xl font-bold text-cyan-400">{selectedTournament.prize_pool} 💎</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">Players ({players.length}/{selectedTournament.max_players})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {players.map((player, i) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border ${
                  player.user_id === userId
                    ? 'bg-primary/20 border-primary'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐂</span>
                  <span className="text-sm font-medium truncate">
                    {player.username || `Player ${i + 1}`}
                  </span>
                </div>
                {player.completion_time_ms && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {(player.completion_time_ms / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            ))}
            {Array.from({ length: selectedTournament.max_players - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-lg border border-dashed border-border/50 bg-muted/10">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-lg opacity-30">🐂</span>
                  <span className="text-sm">Waiting...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {isJoined && selectedTournament.status === 'waiting' && (
            <>
              <Button
                onClick={startTournament}
                className="flex-1 bg-gradient-to-r from-primary to-accent"
                disabled={players.length < 2}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Tournament
              </Button>
              <Button variant="outline" onClick={leaveTournament}>
                Leave
              </Button>
            </>
          )}
          {isJoined && selectedTournament.status === 'active' && (
            <Button
              onClick={() => onJoinTournament(selectedTournament.id)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Play className="w-4 h-4 mr-2" />
              Enter Maze
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSelectedTournament(null)}>
            Back to Lobby
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-primary/10 border-2 border-primary/40">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h2 className="text-2xl font-bold gradient-gold bg-clip-text text-transparent">
            Tournament Lobby
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTournaments}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={createTournament} size="sm">
            Create Tournament
          </Button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active tournaments. Create one to start competing!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border hover:border-primary/50 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {tournament.player_count}/{tournament.max_players}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gem className="w-4 h-4 text-cyan-400" />
                    {tournament.prize_pool} 💎
                  </span>
                  <Badge variant={tournament.status === 'waiting' ? 'outline' : 'default'}>
                    {tournament.status}
                  </Badge>
                </div>
              </div>
              <Button onClick={() => joinTournament(tournament)}>
                {tournament.status === 'waiting' ? 'Join' : 'View'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};