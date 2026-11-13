CREATE TABLE public.user_subscription_bulls (
  user_id uuid PRIMARY KEY,
  bulls integer NOT NULL DEFAULT 0,
  subscription_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_subscription_bulls TO authenticated;
GRANT ALL ON public.user_subscription_bulls TO service_role;
ALTER TABLE public.user_subscription_bulls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription bulls" ON public.user_subscription_bulls FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.holder_key_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX holder_key_awards_user_time ON public.holder_key_awards(user_id, created_at DESC);
GRANT SELECT ON public.holder_key_awards TO authenticated;
GRANT ALL ON public.holder_key_awards TO service_role;
ALTER TABLE public.holder_key_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own key awards" ON public.holder_key_awards FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.csb_total_bulls(_uid uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT max(bulls_owned) FROM public.user_nft_bonuses WHERE user_id=_uid),0)
       + COALESCE((SELECT bulls FROM public.user_subscription_bulls WHERE user_id=_uid
                   AND (subscription_end IS NULL OR subscription_end > now())),0)
$$;
REVOKE EXECUTE ON FUNCTION public.csb_total_bulls(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.csb_add_keys(_uid uuid, _amount integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE target uuid;
BEGIN
  SELECT id INTO target FROM public.user_keys WHERE user_id=_uid ORDER BY created_at,id LIMIT 1 FOR UPDATE;
  IF target IS NULL THEN INSERT INTO public.user_keys(user_id,balance) VALUES(_uid,_amount);
  ELSE UPDATE public.user_keys SET balance=balance+_amount, updated_at=now() WHERE id=target; END IF;
  RETURN (SELECT COALESCE(sum(balance),0)::integer FROM public.user_keys WHERE user_id=_uid);
END $$;
REVOKE EXECUTE ON FUNCTION public.csb_add_keys(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_holder_keys(_game text, _amount integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid(); amt integer; today_total integer; total integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to earn Keys' USING ERRCODE='42501'; END IF;
  IF _game IS NULL OR _game !~ '^[A-Za-z0-9 _:''-]{1,60}$' THEN RAISE EXCEPTION 'Invalid game' USING ERRCODE='22023'; END IF;
  IF public.csb_total_bulls(caller) < 1 THEN RAISE EXCEPTION 'Holders only' USING ERRCODE='42501'; END IF;
  amt := LEAST(GREATEST(COALESCE(_amount,0),0),5);
  IF amt = 0 THEN RAISE EXCEPTION 'Invalid amount' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
  IF EXISTS (SELECT 1 FROM public.holder_key_awards WHERE user_id=caller AND created_at > now() - interval '60 seconds') THEN
    RAISE EXCEPTION 'Please wait a minute between Key rewards' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO today_total FROM public.holder_key_awards
   WHERE user_id=caller AND created_at > date_trunc('day', now());
  amt := LEAST(amt, 30 - today_total);
  IF amt <= 0 THEN RAISE EXCEPTION 'Daily Key limit reached' USING ERRCODE='22023'; END IF;
  INSERT INTO public.holder_key_awards(user_id,game,amount) VALUES(caller,_game,amt);
  total := public.csb_add_keys(caller, amt);
  RETURN jsonb_build_object('awarded',amt,'keys',total);
END $$;
REVOKE EXECUTE ON FUNCTION public.award_holder_keys(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_holder_keys(text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_daily_reward() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid(); d date := (now() AT TIME ZONE 'utc')::date;
  doy integer; dom integer; mult integer; rtype text; ramt integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to claim' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
  IF EXISTS (SELECT 1 FROM public.daily_claims WHERE user_id=caller AND claim_date=d) THEN
    RAISE EXCEPTION 'Already claimed today' USING ERRCODE='23505';
  END IF;
  doy := extract(doy FROM d)::integer; dom := extract(day FROM d)::integer;
  mult := CASE WHEN dom IN (10,20,28) THEN 3 WHEN dom IN (1,5,7,14,15,25) THEN 2 ELSE 1 END;
  CASE doy % 7
    WHEN 0 THEN rtype:='diamonds'; ramt:=500*mult;
    WHEN 1 THEN rtype:='diamonds'; ramt:=200*mult;
    WHEN 2 THEN rtype:='diamonds'; ramt:=1000*mult;
    WHEN 3 THEN rtype:='diamonds'; ramt:=300*mult;
    WHEN 4 THEN rtype:='keys'; ramt:=1*mult;
    WHEN 5 THEN rtype:='diamonds'; ramt:=2000*mult;
    ELSE rtype:='bukals'; ramt:=1;
  END CASE;
  INSERT INTO public.daily_claims(user_id,claim_date,reward_type,reward_amount) VALUES(caller,d,rtype,ramt);
  IF rtype='diamonds' THEN
    INSERT INTO public.user_diamonds(user_id,balance,total_earned) VALUES(caller,ramt,ramt)
    ON CONFLICT(user_id) DO UPDATE SET balance=COALESCE(user_diamonds.balance,0)+ramt, total_earned=COALESCE(user_diamonds.total_earned,0)+ramt;
  ELSIF rtype='keys' THEN PERFORM public.csb_add_keys(caller, ramt);
  ELSE
    INSERT INTO public.user_bukals(user_id,balance) VALUES(caller,ramt)
    ON CONFLICT(user_id) DO UPDATE SET balance=user_bukals.balance+ramt;
  END IF;
  RETURN jsonb_build_object('type',rtype,'amount',ramt,'date',d);
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.daily_claims FROM authenticated, anon;
GRANT ALL ON public.daily_claims TO service_role;

-- Keys: browsers may only spend (lower) Keys; increases come from server functions.
CREATE OR REPLACE FUNCTION public.guard_small_balance() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE cap integer := TG_ARGV[0]::integer;
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.balance < 0 THEN RAISE EXCEPTION 'Balance cannot be negative'; END IF;
    IF TG_TABLE_NAME = 'user_keys' THEN
      IF TG_OP = 'INSERT' THEN NEW.balance := 0;
      ELSIF NEW.balance > OLD.balance THEN RAISE EXCEPTION 'Keys can only be earned through the game server'; END IF;
      NEW.user_id := COALESCE(OLD.user_id, NEW.user_id);
      RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.balance > cap THEN NEW.balance := 0; END IF;
    IF TG_OP = 'UPDATE' AND NEW.balance - OLD.balance > cap THEN RAISE EXCEPTION 'Reward too large'; END IF;
  END IF;
  RETURN NEW;
END $$;