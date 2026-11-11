CREATE OR REPLACE FUNCTION public.swap_game_currency(_swap text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  credit_balance bigint;
  diamond_balance bigint;
  target_id uuid;
  cost bigint;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to swap' USING ERRCODE = '42501'; END IF;
  IF _swap IS NULL OR _swap NOT IN ('credits_to_diamonds','credits_to_bukals','diamonds_to_keys') THEN
    RAISE EXCEPTION 'Invalid swap' USING ERRCODE = '22023';
  END IF;
  -- Serialize every swap for this account; amounts and destination are server-owned.
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  IF _swap IN ('credits_to_diamonds','credits_to_bukals') THEN
    cost := CASE WHEN _swap = 'credits_to_diamonds' THEN 100 ELSE 1000000 END;
    SELECT balance INTO credit_balance FROM public.user_credits WHERE user_id = caller FOR UPDATE;
    IF credit_balance IS NULL OR credit_balance < cost THEN
      RAISE EXCEPTION 'Not enough Credits' USING ERRCODE = '22023';
    END IF;
    UPDATE public.user_credits SET balance = balance - cost WHERE user_id = caller;
    IF _swap = 'credits_to_diamonds' THEN
      INSERT INTO public.user_diamonds (user_id, balance, total_earned) VALUES (caller, 5, 5)
      ON CONFLICT (user_id) DO UPDATE SET balance = COALESCE(user_diamonds.balance,0) + 5,
        total_earned = COALESCE(user_diamonds.total_earned,0) + 5;
    ELSE
      INSERT INTO public.user_bukals (user_id, balance) VALUES (caller, 1)
      ON CONFLICT (user_id) DO UPDATE SET balance = user_bukals.balance + 1;
    END IF;
  ELSE
    SELECT balance INTO diamond_balance FROM public.user_diamonds WHERE user_id = caller FOR UPDATE;
    IF diamond_balance IS NULL OR diamond_balance < 1000000 THEN
      RAISE EXCEPTION 'Not enough Diamonds' USING ERRCODE = '22023';
    END IF;
    UPDATE public.user_diamonds SET balance = balance - 1000000 WHERE user_id = caller;
    SELECT id INTO target_id FROM public.user_keys WHERE user_id = caller ORDER BY created_at, id LIMIT 1 FOR UPDATE;
    IF target_id IS NULL THEN
      INSERT INTO public.user_keys (user_id, balance) VALUES (caller, 1);
    ELSE
      UPDATE public.user_keys SET balance = balance + 1 WHERE id = target_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('swap', _swap, 'credits', (SELECT balance FROM public.user_credits WHERE user_id = caller),
    'diamonds', (SELECT balance FROM public.user_diamonds WHERE user_id = caller));
END $$;
REVOKE ALL ON FUNCTION public.swap_game_currency(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swap_game_currency(text) TO authenticated;
COMMENT ON FUNCTION public.swap_game_currency(text) IS 'Atomic fixed-rate swaps for auth.uid(); never accepts amounts or another user ID. Game payouts remain separate.';