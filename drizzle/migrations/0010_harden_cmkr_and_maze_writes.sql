CREATE OR REPLACE FUNCTION public.cmkr_enforce_monthly_cap()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE minted bigint; hour_place bigint;
BEGIN
  NEW.amount := 1;
  NEW.created_at := now();
  NEW.day := (now() AT TIME ZONE 'utc')::date;
  NEW.month := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  IF NEW.place_id IS NULL OR NEW.place_id !~ '^[a-z0-9_-]{1,40}$' THEN
    RAISE EXCEPTION 'Invalid place';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cmkr_earnings WHERE user_id = NEW.user_id AND created_at > now() - interval '5 seconds') THEN
    RAISE EXCEPTION 'Mining too fast';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO hour_place FROM public.cmkr_earnings
   WHERE user_id = NEW.user_id AND place_id = NEW.place_id AND created_at > now() - interval '1 hour';
  IF hour_place + NEW.amount > 5 THEN RAISE EXCEPTION 'Limit of 5 CMKR per place per hour reached'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO minted FROM public.cmkr_earnings WHERE month = NEW.month;
  IF minted + NEW.amount > 1000000 THEN RAISE EXCEPTION 'Monthly CMKR cap of 1,000,000 reached'; END IF;
  RETURN NEW;
END;
$function$;

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
      NEW.status := OLD.status; NEW.round_eliminated := OLD.round_eliminated;
      IF OLD.completion_time_ms IS NOT NULL THEN NEW.completion_time_ms := OLD.completion_time_ms; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.guard_maze_time() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_maze_time ON public.maze_leaderboard;
CREATE TRIGGER guard_maze_time BEFORE INSERT ON public.maze_leaderboard FOR EACH ROW EXECUTE FUNCTION public.guard_maze_time();
DROP TRIGGER IF EXISTS guard_tournament_time ON public.tournament_players;
CREATE TRIGGER guard_tournament_time BEFORE UPDATE ON public.tournament_players FOR EACH ROW EXECUTE FUNCTION public.guard_maze_time();