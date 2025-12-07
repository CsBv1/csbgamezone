-- Create world chat messages table
CREATE TABLE public.world_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT,
  message TEXT NOT NULL,
  is_emote BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_chat ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view chat messages"
ON public.world_chat
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.world_chat
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_chat;

-- Auto-delete old messages (older than 1 hour) with a function
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.world_chat WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;