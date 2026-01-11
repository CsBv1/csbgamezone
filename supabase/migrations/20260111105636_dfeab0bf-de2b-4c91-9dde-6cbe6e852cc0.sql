-- Create user_bukals table for the new trophy currency
CREATE TABLE public.user_bukals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bukals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bukals"
  ON public.user_bukals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bukals"
  ON public.user_bukals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bukals"
  ON public.user_bukals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Public view for leaderboard
CREATE POLICY "Public can view bukals for leaderboard"
  ON public.user_bukals
  FOR SELECT
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bukals;