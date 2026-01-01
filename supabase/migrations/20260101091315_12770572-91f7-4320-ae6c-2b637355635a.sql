-- Create table for player emote bubbles (broadcast to all players)
CREATE TABLE public.player_emotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text,
  emote text NOT NULL,
  x real NOT NULL,
  y real NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '3 seconds')
);

ALTER TABLE public.player_emotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view emotes" ON public.player_emotes FOR SELECT USING (true);
CREATE POLICY "Users can send emotes" ON public.player_emotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clean up expired emotes" ON public.player_emotes FOR DELETE USING (expires_at < now());

-- Enable realtime for emotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_emotes;

-- Create maze tournaments table
CREATE TABLE public.maze_tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  round_number integer NOT NULL DEFAULT 1,
  max_players integer NOT NULL DEFAULT 8,
  prize_pool integer NOT NULL DEFAULT 100,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maze_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments" ON public.maze_tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON public.maze_tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tournaments" ON public.maze_tournaments FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create tournament participants table  
CREATE TABLE public.tournament_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.maze_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text,
  completion_time_ms integer,
  round_eliminated integer,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament players" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Users can join tournaments" ON public.tournament_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entry" ON public.tournament_players FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for tournaments
ALTER PUBLICATION supabase_realtime ADD TABLE public.maze_tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_players;

-- Create NFT bonuses table for storing scanned wallet NFT info
CREATE TABLE public.user_nft_bonuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bulls_owned integer NOT NULL DEFAULT 0,
  rarity_bonus numeric NOT NULL DEFAULT 0,
  highest_rarity text DEFAULT 'none',
  last_scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_nft_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own NFT bonuses" ON public.user_nft_bonuses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own NFT bonuses" ON public.user_nft_bonuses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own NFT bonuses" ON public.user_nft_bonuses FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_nft_bonuses_updated_at
BEFORE UPDATE ON public.user_nft_bonuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();