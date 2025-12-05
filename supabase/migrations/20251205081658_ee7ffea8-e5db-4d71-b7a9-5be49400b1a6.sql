-- Create maze_leaderboard table to store fastest times
CREATE TABLE public.maze_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT,
  wallet_name TEXT,
  completion_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maze_leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can view the leaderboard
CREATE POLICY "Anyone can view maze leaderboard" 
ON public.maze_leaderboard 
FOR SELECT 
USING (true);

-- Authenticated users can insert their own records
CREATE POLICY "Users can insert their own records" 
ON public.maze_leaderboard 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_maze_leaderboard_time ON public.maze_leaderboard (completion_time_ms ASC);
CREATE INDEX idx_maze_leaderboard_user ON public.maze_leaderboard (user_id);