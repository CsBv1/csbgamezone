-- Add public read access to user_nft_bonuses for leaderboard bulls display
CREATE POLICY "Public can view bulls owned for leaderboard" 
ON public.user_nft_bonuses 
FOR SELECT 
USING (true);