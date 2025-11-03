-- Create table for user keys
CREATE TABLE public.user_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for user keys
CREATE POLICY "Users can view own keys"
ON public.user_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keys"
ON public.user_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keys"
ON public.user_keys
FOR UPDATE
USING (auth.uid() = user_id);

-- Create table for user colors (cosmetic rewards)
CREATE TABLE public.user_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_value TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_colors ENABLE ROW LEVEL SECURITY;

-- Create policies for user colors
CREATE POLICY "Users can view own colors"
ON public.user_colors
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active colors for leaderboard"
ON public.user_colors
FOR SELECT
USING (active = true);

CREATE POLICY "Users can insert own colors"
ON public.user_colors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own colors"
ON public.user_colors
FOR UPDATE
USING (auth.uid() = user_id);

-- Update handle_new_user function to include keys
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || substr(NEW.id::text, 1, 8))
  );
  
  INSERT INTO public.user_diamonds (user_id, balance, total_earned)
  VALUES (NEW.id, 0, 0);
  
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 500);
  
  INSERT INTO public.user_keys (user_id, balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;