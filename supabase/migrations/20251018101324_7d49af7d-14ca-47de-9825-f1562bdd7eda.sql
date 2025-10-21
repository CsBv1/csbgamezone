-- Fix security definer issue by removing SECURITY DEFINER from view
DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE VIEW public.leaderboard 
WITH (security_invoker = true) AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ud.total_earned DESC, ud.balance DESC) as rank,
  p.username,
  p.avatar_url,
  COALESCE(ud.balance, 0) as total_diamonds,
  COALESCE(COUNT(DISTINCT CASE WHEN gr.result = 'win' THEN gr.id END), 0)::bigint as total_wins,
  COALESCE(COUNT(DISTINCT gr.id), 0)::bigint as total_games
FROM public.profiles p
LEFT JOIN public.user_diamonds ud ON p.id = ud.user_id
LEFT JOIN public.game_results gr ON p.id = gr.user_id
WHERE ud.balance > 0 OR ud.total_earned > 0
GROUP BY p.id, p.username, p.avatar_url, ud.balance, ud.total_earned
ORDER BY ud.total_earned DESC, ud.balance DESC
LIMIT 25;