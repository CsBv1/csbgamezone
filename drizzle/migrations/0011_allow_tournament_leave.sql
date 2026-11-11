CREATE OR REPLACE FUNCTION public.guard_maze_time()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.completion_time_ms IS NOT NULL AND (NEW.completion_time_ms < 5000 OR NEW.completion_time_ms > 3600000) THEN
      RAISE EXCEPTION 'Invalid completion time';
    END IF;
    IF TG_TABLE_NAME = 'maze_leaderboard' THEN
      NEW.created_at := now();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.tournament_id := OLD.tournament_id; NEW.user_id := OLD.user_id;
      IF NEW.status IS DISTINCT FROM OLD.status AND NOT (NEW.status IN ('left','eliminated') AND OLD.status = 'active') THEN
        NEW.status := OLD.status;
      END IF;
      IF OLD.completion_time_ms IS NOT NULL THEN NEW.completion_time_ms := OLD.completion_time_ms; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;