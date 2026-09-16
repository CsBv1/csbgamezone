CREATE OR REPLACE FUNCTION public.cmkr_enforce_monthly_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  minted bigint;
  hour_place bigint;
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

  SELECT COALESCE(SUM(amount), 0) INTO hour_place
  FROM public.cmkr_earnings
  WHERE user_id = NEW.user_id
    AND place_id = NEW.place_id
    AND created_at > now() - interval '1 hour';

  IF hour_place + NEW.amount > 5 THEN
    RAISE EXCEPTION 'Limit of 5 CMKR per place per hour reached';
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