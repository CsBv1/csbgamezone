
-- Drop and recreate the leaderboard view without the expensive game_results join
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(ud.total_earned, 0) AS total_diamonds,
  COALESCE(gs.total_games, 0)::bigint AS total_games,
  COALESCE(gs.total_wins, 0)::bigint AS total_wins,
  row_number() OVER (ORDER BY COALESCE(ud.total_earned, 0) DESC) AS rank
FROM profiles p
LEFT JOIN user_diamonds ud ON p.id = ud.user_id
LEFT JOIN LATERAL (
  SELECT 
    count(*) AS total_games,
    count(*) FILTER (WHERE result = 'win') AS total_wins
  FROM game_results gr
  WHERE gr.user_id = p.id
) gs ON true
WHERE ud.total_earned > 0
ORDER BY COALESCE(ud.total_earned, 0) DESC;

-- Add index on game_results for faster per-user counts
CREATE INDEX IF NOT EXISTS idx_game_results_user_id_result ON public.game_results(user_id, result);
