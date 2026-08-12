ALTER TABLE public.cmkr_earnings DROP CONSTRAINT IF EXISTS cmkr_earnings_user_id_month_place_id_key;
ALTER TABLE public.cmkr_earnings ADD COLUMN IF NOT EXISTS day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date;
CREATE INDEX IF NOT EXISTS cmkr_earnings_user_day_place_idx ON public.cmkr_earnings (user_id, day, place_id);
CREATE INDEX IF NOT EXISTS cmkr_earnings_month_idx ON public.cmkr_earnings (month);

CREATE OR REPLACE FUNCTION public.cmkr_enforce_monthly_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  minted bigint;
  today_place bigint;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount < 1 THEN
    NEW.amount := 1;
  END IF;
  IF NEW.amount > 1 THEN
    RAISE EXCEPTION 'Only 1 CMKR can be earned per mining action';
  END IF;

  IF NEW.day IS NULL THEN
    NEW.day := (now() AT TIME ZONE 'utc')::date;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO today_place
  FROM public.cmkr_earnings
  WHERE user_id = NEW.user_id AND day = NEW.day AND place_id = NEW.place_id;

  IF today_place + NEW.amount > 5 THEN
    RAISE EXCEPTION 'Daily limit of 5 CMKR per place reached';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO minted
  FROM public.cmkr_earnings
  WHERE month = NEW.month;

  IF minted + NEW.amount > 1000000 THEN
    RAISE EXCEPTION 'Monthly CMKR cap of 1,000,000 reached';
  END IF;

  RETURN NEW;
END;
$function$;