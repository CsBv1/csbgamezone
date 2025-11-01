-- Allow public read access to profile data needed for leaderboard
CREATE POLICY "Public can view usernames and avatars"
ON public.profiles
FOR SELECT
USING (true);

-- Allow public read access to diamond balances for leaderboard
CREATE POLICY "Public can view diamond stats for leaderboard"
ON public.user_diamonds
FOR SELECT
USING (true);

-- Allow public read access to game results for leaderboard stats
CREATE POLICY "Public can view game results for leaderboard"
ON public.game_results
FOR SELECT
USING (true);