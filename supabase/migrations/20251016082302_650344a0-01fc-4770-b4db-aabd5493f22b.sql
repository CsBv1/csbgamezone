-- Update the handle_new_user function to give 500 starting credits instead of 100
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || substr(NEW.id::text, 1, 8))
  );
  
  INSERT INTO public.user_diamonds (user_id, balance, total_earned)
  VALUES (NEW.id, 0, 0);
  
  -- Updated to 500 starting credits
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 500);
  
  RETURN NEW;
END;
$function$;