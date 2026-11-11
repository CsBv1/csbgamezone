CREATE OR REPLACE FUNCTION public.purchase_csb_tcg_card(_card_id text)
RETURNS public.csb_tcg_cards
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller uuid := auth.uid(); price integer; funds bigint; result public.csb_tcg_cards;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to purchase cards' USING ERRCODE='42501'; END IF;
 price := CASE _card_id
 WHEN 'rune_acolyte' THEN 120 WHEN 'stake_guard' THEN 200
 WHEN 'oracle_drone' THEN 320 WHEN 'chain_golem' THEN 600
 WHEN 'rune_bolt' THEN 180 WHEN 'stake_shield' THEN 140
 WHEN 'horn_charge' THEN 220 WHEN 'ada_blessing' THEN 260
 WHEN 'cardano_storm' THEN 480 WHEN 'bull_run' THEN 420 END;
 IF price IS NULL THEN RAISE EXCEPTION 'Invalid card' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
 SELECT balance INTO funds FROM public.csbv1_players WHERE user_id=caller FOR UPDATE;
 IF funds IS NULL THEN RAISE EXCEPTION 'Player unavailable' USING ERRCODE='22023'; END IF;
 IF funds<price THEN RAISE EXCEPTION 'Not enough Rune Power' USING ERRCODE='22023'; END IF;
 UPDATE public.csbv1_players SET balance=balance-price WHERE user_id=caller;
 INSERT INTO public.csb_tcg_cards(user_id,card_id,quantity) VALUES(caller,_card_id,1)
 ON CONFLICT(user_id,card_id) DO UPDATE SET quantity=public.csb_tcg_cards.quantity+1
 RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.purchase_csb_tcg_card(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_csb_tcg_card(text) TO authenticated;
DROP POLICY IF EXISTS "Users can add their own cards" ON public.csb_tcg_cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON public.csb_tcg_cards;
REVOKE INSERT, UPDATE, DELETE ON public.csb_tcg_cards FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.csb_tcg_cards TO authenticated;
GRANT ALL ON public.csb_tcg_cards TO service_role;