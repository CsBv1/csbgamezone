import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Crown } from "lucide-react";

interface BracketPlayer {
  id: string;
  username: string | null;
  completion_time_ms: number | null;
  status: string;
  round_eliminated: number | null;
}

interface TournamentBracketProps {
  players: BracketPlayer[];
  currentRound: number;
  totalRounds: number;
  prizePool: number;
}

export const TournamentBracket = ({ 
  players, 
  currentRound, 
  totalRounds,
  prizePool 
}: TournamentBracketProps) => {
  // Sort players by completion time for current round
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.status === 'eliminated') return 1;
    if (b.status === 'eliminated') return -1;
    if (!a.completion_time_ms) return 1;
    if (!b.completion_time_ms) return -1;
    return a.completion_time_ms - b.completion_time_ms;
  });

  // Calculate how many advance each round (half advance)
  const playersPerRound = [players.length];
  for (let i = 1; i < totalRounds; i++) {
    playersPerRound.push(Math.ceil(playersPerRound[i - 1] / 2));
  }

  const getPrizeForPosition = (position: number) => {
    if (position === 1) return Math.floor(prizePool * 0.5);
    if (position === 2) return Math.floor(prizePool * 0.3);
    if (position === 3) return Math.floor(prizePool * 0.15);
    return Math.floor(prizePool * 0.05 / Math.max(1, players.length - 3));
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-yellow-500/5 border-2 border-yellow-500/30">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h3 className="text-xl font-bold gradient-gold bg-clip-text text-transparent">
          Tournament Bracket
        </h3>
        <Badge variant="outline" className="ml-auto">
          Round {currentRound}/{totalRounds}
        </Badge>
      </div>

      {/* Round Progress */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i + 1 < currentRound
                  ? 'bg-green-600 text-white'
                  : i + 1 === currentRound
                  ? 'bg-primary text-primary-foreground animate-pulse'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            {i < totalRounds - 1 && (
              <div
                className={`w-8 h-1 ${
                  i + 1 < currentRound ? 'bg-green-600' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Player Rankings */}
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const isEliminated = player.status === 'eliminated';
          const position = index + 1;
          
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                isEliminated
                  ? 'bg-red-500/10 border border-red-500/30 opacity-60'
                  : position <= Math.ceil(players.filter(p => p.status !== 'eliminated').length / 2)
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-muted/20 border border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    position === 1
                      ? 'bg-yellow-500 text-black'
                      : position === 2
                      ? 'bg-gray-400 text-black'
                      : position === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {position === 1 ? <Crown className="w-4 h-4" /> : position}
                </div>
                <div>
                  <span className={`font-medium ${isEliminated ? 'line-through' : ''}`}>
                    {player.username || `Player ${position}`}
                  </span>
                  {isEliminated && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Eliminated R{player.round_eliminated}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {player.completion_time_ms && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {(player.completion_time_ms / 1000).toFixed(2)}s
                  </div>
                )}
                {position <= 3 && !isEliminated && (
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                    {getPrizeForPosition(position)} 💎
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prize Distribution */}
      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30">
        <h4 className="font-semibold mb-2 text-foreground">Prize Pool: {prizePool} 💎</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-yellow-500 font-bold">🥇 1st</div>
            <div className="text-muted-foreground">{getPrizeForPosition(1)} 💎</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 font-bold">🥈 2nd</div>
            <div className="text-muted-foreground">{getPrizeForPosition(2)} 💎</div>
          </div>
          <div className="text-center">
            <div className="text-amber-700 font-bold">🥉 3rd</div>
            <div className="text-muted-foreground">{getPrizeForPosition(3)} 💎</div>
          </div>
        </div>
      </div>
    </Card>
  );
};