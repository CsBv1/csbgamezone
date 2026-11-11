CREATE OR REPLACE FUNCTION public.purchase_csb_upgrade(_upgrade text)
RETURNS public.csbv1_upgrades LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid:=auth.uid(); base integer; lvl integer; price numeric; funds bigint; result public.csbv1_upgrades;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to upgrade' USING ERRCODE='42501'; END IF;
 base:=CASE _upgrade WHEN 'reward_boost' THEN 100 WHEN 'energy_capacity' THEN 150 WHEN 'cooldown_reduction' THEN 200 END;
 IF base IS NULL THEN RAISE EXCEPTION 'Invalid upgrade' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
 SELECT balance INTO funds FROM public.csbv1_players WHERE user_id=caller FOR UPDATE;
 IF funds IS NULL THEN RAISE EXCEPTION 'Player unavailable' USING ERRCODE='22023'; END IF;
 SELECT level INTO lvl FROM public.csbv1_upgrades WHERE user_id=caller AND upgrade_type=_upgrade FOR UPDATE;
 lvl:=COALESCE(lvl,0);
 IF lvl<0 OR lvl>100 THEN RAISE EXCEPTION 'Upgrade unavailable' USING ERRCODE='22023'; END IF;
 price:=floor(base*power(1.6::numeric,lvl));
 IF funds<price THEN RAISE EXCEPTION 'Not enough Rune Power' USING ERRCODE='22023'; END IF;
 UPDATE public.csbv1_players SET balance=balance-price::bigint,
 max_energy=CASE WHEN _upgrade='energy_capacity' THEN LEAST(500,100+(lvl+1)*20) ELSE max_energy END WHERE user_id=caller;
 INSERT INTO public.csbv1_upgrades(user_id,upgrade_type,level) VALUES(caller,_upgrade,lvl+1)
 ON CONFLICT(user_id,upgrade_type) DO UPDATE SET level=EXCLUDED.level RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.purchase_csb_upgrade(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_csb_upgrade(text) TO authenticated;
DROP POLICY IF EXISTS "Users can insert own upgrades" ON public.csbv1_upgrades;
DROP POLICY IF EXISTS "Users can update own upgrades" ON public.csbv1_upgrades;
REVOKE INSERT,UPDATE,DELETE ON public.csbv1_upgrades FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.csbv1_upgrades TO service_role;