-- Enable realtime for user_credits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;

-- Enable realtime for user_diamonds table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_diamonds;