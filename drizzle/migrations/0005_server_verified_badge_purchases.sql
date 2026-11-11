CREATE OR REPLACE FUNCTION public.purchase_csb_badge(_badge_id text)
RETURNS public.user_badges LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 caller uuid := auth.uid(); item record; result public.user_badges; funds bigint;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to buy badges' USING ERRCODE='42501'; END IF;
 SELECT * INTO item FROM (VALUES
 ('csb_legendary_gold','Legendary Gold','#FFD700',50000),
 ('csb_legendary_platinum','Legendary Platinum','#E5E4E2',40000),
 ('csb_legendary_diamond','Legendary Diamond','#B9F2FF',30000),
 ('csb_epic_ruby','Epic Ruby','#E0115F',20000),
 ('csb_epic_emerald','Epic Emerald','#50C878',15000),
 ('csb_epic_sapphire','Epic Sapphire','#0F52BA',10000),
 ('csb_rare_amethyst','Rare Amethyst','#9966CC',7500),
 ('csb_rare_topaz','Rare Topaz','#FFC87C',5000),
 ('csb_rare_jade','Rare Jade','#00A86B',3000),
 ('csb_uncommon_bronze','Uncommon Bronze','#CD7F32',2000),
 ('csb_uncommon_silver','Uncommon Silver','#C0C0C0',1000),
 ('csb_common_copper','Common Copper','#B87333',500)
 ) AS catalog(id,name,color,cost) WHERE id=_badge_id;
 IF item.id IS NULL THEN RAISE EXCEPTION 'Invalid badge' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
 SELECT * INTO result FROM public.user_badges WHERE user_id=caller AND badge_id=_badge_id;
 IF result.id IS NOT NULL THEN RETURN result; END IF;
 SELECT balance INTO funds FROM public.user_diamonds WHERE user_id=caller FOR UPDATE;
 IF funds IS NULL OR funds<item.cost THEN RAISE EXCEPTION 'Not enough Diamonds' USING ERRCODE='22023'; END IF;
 UPDATE public.user_diamonds SET balance=balance-item.cost WHERE user_id=caller;
 INSERT INTO public.user_badges(user_id,badge_id,badge_name,badge_color,diamond_cost,active)
 VALUES(caller,item.id,item.name,item.color,item.cost,false) RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.purchase_csb_badge(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_csb_badge(text) TO authenticated;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;
REVOKE INSERT, UPDATE ON public.user_badges FROM PUBLIC, anon, authenticated;
GRANT UPDATE (active) ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
COMMENT ON FUNCTION public.purchase_csb_badge(text) IS 'Authenticated atomic badge purchase; server-owned catalog, fixed cost, duplicate-safe and owner-scoped.';