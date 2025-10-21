-- Fix security issue: Remove wallet address from public leaderboard view
DROP VIEW IF EXISTS public.leaderboard;

-- Recreate leaderboard view without exposing wallet addresses (top 50)
CREATE VIEW public.leaderboard 
WITH (security_invoker=on)
AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ud.total_earned DESC) as rank,
  ud.total_earned as total_diamonds,
  COUNT(gr.id) FILTER (WHERE gr.result = 'win') as total_wins,
  COUNT(gr.id) as total_games,
  COALESCE(p.username, 'Anonymous Bull') as username,
  p.avatar_url
FROM public.user_diamonds ud
JOIN public.profiles p ON ud.user_id = p.id
LEFT JOIN public.game_results gr ON ud.user_id = gr.user_id
GROUP BY ud.user_id, ud.total_earned, p.username, p.avatar_url
ORDER BY ud.total_earned DESC
LIMIT 50;