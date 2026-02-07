-- Create user_badges table for CSB Ambassador Badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  diamond_cost INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Public can view active badges for leaderboard
CREATE POLICY "Public can view active badges for leaderboard"
ON public.user_badges
FOR SELECT
USING (active = true);

-- Users can insert own badges (purchase)
CREATE POLICY "Users can insert own badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own badges (activate/deactivate)
CREATE POLICY "Users can update own badges"
ON public.user_badges
FOR UPDATE
USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate badge purchases
CREATE UNIQUE INDEX idx_user_badges_unique ON public.user_badges (user_id, badge_id);

-- Enable realtime for badges
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;