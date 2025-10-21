-- Fix security warning: Update leaderboard view to use SECURITY INVOKER
-- First drop the existing view
DROP VIEW IF EXISTS public.leaderboard;

-- Recreate the leaderboard view with SECURITY INVOKER
CREATE VIEW public.leaderboard 
WITH (security_invoker=on)
AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ud.total_earned DESC) as rank,
  ud.total_earned as total_diamonds,
  COUNT(gr.id) FILTER (WHERE gr.result = 'win') as total_wins,
  COUNT(gr.id) as total_games,
  p.wallet_name,
  p.avatar_url,
  p.username,
  p.wallet_address
FROM public.user_diamonds ud
JOIN public.profiles p ON ud.user_id = p.id
LEFT JOIN public.game_results gr ON ud.user_id = gr.user_id
GROUP BY ud.user_id, ud.total_earned, p.wallet_name, p.avatar_url, p.username, p.wallet_address
ORDER BY ud.total_earned DESC
LIMIT 100;