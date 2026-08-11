CREATE TABLE public.cmkr_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  username text,
  place_id text NOT NULL,
  month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  amount integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, place_id)
);

GRANT SELECT, INSERT ON public.cmkr_earnings TO authenticated;
GRANT ALL ON public.cmkr_earnings TO service_role;

ALTER TABLE public.cmkr_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users can view CMKR earnings"
  ON public.cmkr_earnings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can record their own CMKR earnings"
  ON public.cmkr_earnings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cmkr_earnings_month ON public.cmkr_earnings (month);
CREATE INDEX idx_cmkr_earnings_user_month ON public.cmkr_earnings (user_id, month);

CREATE OR REPLACE FUNCTION public.cmkr_enforce_monthly_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  minted bigint;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount < 1 THEN
    NEW.amount := 1;
  END IF;
  IF NEW.amount > 1 THEN
    RAISE EXCEPTION 'Only 1 CMKR can be earned per place';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO minted
  FROM public.cmkr_earnings
  WHERE month = NEW.month;

  IF minted + NEW.amount > 1000000 THEN
    RAISE EXCEPTION 'Monthly CMKR cap of 1,000,000 reached';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cmkr_earnings_cap
BEFORE INSERT ON public.cmkr_earnings
FOR EACH ROW EXECUTE FUNCTION public.cmkr_enforce_monthly_cap();