CREATE OR REPLACE VIEW public.leaderboard WITH (security_invoker = true) AS
SELECT 
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(d.balance, 0::bigint) AS total_diamonds,
  COALESCE(g.total_games, 0::bigint) AS total_games,
  COALESCE(g.total_wins, 0::bigint) AS total_wins,
  row_number() OVER (ORDER BY COALESCE(d.balance, 0::bigint) DESC) AS rank
FROM profiles p
LEFT JOIN user_diamonds d ON d.user_id = p.id
LEFT JOIN (
  SELECT game_results.user_id,
    count(*) AS total_games,
    count(*) FILTER (WHERE game_results.result = 'win'::text) AS total_wins
  FROM game_results
  GROUP BY game_results.user_id
) g ON g.user_id = p.id
WHERE COALESCE(d.balance, 0::bigint) > 0
ORDER BY COALESCE(d.balance, 0::bigint) DESC
LIMIT 100;