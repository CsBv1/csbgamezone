-- Create table for multiplayer game rooms
CREATE TABLE public.game_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type text NOT NULL,
  status text NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  round_data jsonb DEFAULT '{}'::jsonb,
  max_players integer DEFAULT 10
);

-- Create table for players in game rooms
CREATE TABLE public.game_room_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text,
  bet_amount integer DEFAULT 0,
  cashed_out_at numeric,
  winnings integer DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_room_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_rooms
CREATE POLICY "Anyone can view game rooms" ON public.game_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rooms" ON public.game_rooms FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS policies for game_room_players  
CREATE POLICY "Anyone can view room players" ON public.game_room_players FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.game_room_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entry" ON public.game_room_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.game_room_players FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_room_players;