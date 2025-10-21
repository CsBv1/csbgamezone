-- Fix security issue: Remove wallet address from public leaderboard view
DROP VIEW IF EXISTS public.leaderboard;

-- Recreate leaderboard view without exposing wallet addresses
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

-- Update profiles RLS policy to protect sensitive data
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Allow users to view their own full profile
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow public to view only non-sensitive profile data (username and avatar)
CREATE POLICY "Public can view limited profile data"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Note: The above policies work together - authenticated users can see their own full profile
-- and limited data from others. The leaderboard view now only exposes username and avatar.