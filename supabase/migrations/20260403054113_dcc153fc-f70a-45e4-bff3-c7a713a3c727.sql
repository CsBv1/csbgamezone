-- Drop view first so we can alter columns
DROP VIEW IF EXISTS public.leaderboard;

-- Upgrade to bigint to remove the 2.1B cap
ALTER TABLE public.user_diamonds ALTER COLUMN balance TYPE bigint;
ALTER TABLE public.user_diamonds ALTER COLUMN total_earned TYPE bigint;

-- Recreate leaderboard view
CREATE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(d.total_earned, 0)::bigint AS total_diamonds,
  COALESCE(g.total_games, 0) AS total_games,
  COALESCE(g.total_wins, 0) AS total_wins,
  ROW_NUMBER() OVER (ORDER BY COALESCE(d.total_earned, 0) DESC) AS rank
FROM public.profiles p
LEFT JOIN public.user_diamonds d ON d.user_id = p.id
LEFT JOIN (
  SELECT user_id,
    COUNT(*) AS total_games,
    COUNT(*) FILTER (WHERE result = 'win') AS total_wins
  FROM public.game_results
  GROUP BY user_id
) g ON g.user_id = p.id
WHERE COALESCE(d.total_earned, 0) > 0
ORDER BY total_diamonds DESC
LIMIT 100;