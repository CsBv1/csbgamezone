-- Create table for player positions in the virtual world
CREATE TABLE public.world_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  x REAL NOT NULL DEFAULT 400,
  y REAL NOT NULL DEFAULT 300,
  direction TEXT NOT NULL DEFAULT 'down',
  color TEXT NOT NULL DEFAULT '#FFD700',
  username TEXT,
  is_online BOOLEAN NOT NULL DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_players ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all online players"
ON public.world_players FOR SELECT
USING (is_online = true);

CREATE POLICY "Users can insert own position"
ON public.world_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own position"
ON public.world_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own position"
ON public.world_players FOR DELETE
USING (auth.uid() = user_id);

-- Create table for world diamonds that spawn
CREATE TABLE public.world_diamonds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x REAL NOT NULL,
  y REAL NOT NULL,
  value INTEGER NOT NULL DEFAULT 1,
  collected_by UUID,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS
ALTER TABLE public.world_diamonds ENABLE ROW LEVEL SECURITY;

-- Anyone can view uncollected diamonds
CREATE POLICY "Anyone can view uncollected diamonds"
ON public.world_diamonds FOR SELECT
USING (collected_by IS NULL);

-- Users can update diamonds they collect
CREATE POLICY "Users can collect diamonds"
ON public.world_diamonds FOR UPDATE
USING (collected_by IS NULL)
WITH CHECK (auth.uid() = collected_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_diamonds;