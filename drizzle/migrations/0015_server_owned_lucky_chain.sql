CREATE TABLE public.lucky_chain_runs (
 user_id uuid PRIMARY KEY,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 chain integer NOT NULL DEFAULT 0 CHECK (chain BETWEEN 0 AND 20),
 diamonds bigint NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid')),
 last_step_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lucky_chain_runs TO authenticated;
GRANT ALL ON public.lucky_chain_runs TO service_role;
ALTER TABLE public.lucky_chain_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own Lucky Chain" ON public.lucky_chain_runs FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.lucky_chain_action(_action text, _run_id uuid DEFAULT NULL, _expected_chain integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid:=auth.uid(); run public.lucky_chain_runs; key_row uuid; key_balance integer; success boolean:=NULL; reward bigint:=0; payout bigint:=0;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to play' USING ERRCODE='42501'; END IF;
 IF _action IS NULL OR _action NOT IN ('start','continue','cash_out') THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
 SELECT * INTO run FROM public.lucky_chain_runs WHERE user_id=caller FOR UPDATE;
 IF _action='start' THEN
  IF run.user_id IS NULL OR run.status='paid' THEN
   SELECT id,balance INTO key_row,key_balance FROM public.user_keys WHERE user_id=caller ORDER BY created_at,id LIMIT 1 FOR UPDATE;
   IF key_row IS NULL OR key_balance<1 THEN RAISE EXCEPTION 'You need a Key to enter' USING ERRCODE='22023'; END IF;
   UPDATE public.user_keys SET balance=balance-1,updated_at=now() WHERE id=key_row;
   INSERT INTO public.lucky_chain_runs(user_id) VALUES(caller) ON CONFLICT(user_id) DO UPDATE SET id=gen_random_uuid(),chain=0,diamonds=0,status='active',last_step_at=now(),updated_at=now() RETURNING * INTO run;
  END IF;
 ELSE
  IF run.user_id IS NULL OR _run_id IS DISTINCT FROM run.id THEN RAISE EXCEPTION 'Invalid run' USING ERRCODE='22023'; END IF;
  IF run.status='active' THEN
   IF _expected_chain IS DISTINCT FROM run.chain THEN RAISE EXCEPTION 'Game changed; refresh and try again' USING ERRCODE='22023'; END IF;
   IF _action='continue' THEN
    IF clock_timestamp()<run.last_step_at+interval '1.5 seconds' THEN RAISE EXCEPTION 'Please wait for the next link' USING ERRCODE='22023'; END IF;
    success:=random()<greatest(0.3,0.9-run.chain*0.05);
    IF success THEN
     run.chain:=run.chain+1;
     reward:=20000+6000*run.chain;
     run.diamonds:=run.diamonds+reward;
     IF run.chain=20 THEN run.diamonds:=run.diamonds+500000; run.status:='paid'; END IF;
    ELSE run.status:='paid'; END IF;
   ELSE run.status:='paid'; END IF;
   IF run.status='paid' THEN
    payout:=run.diamonds;
    INSERT INTO public.user_diamonds(user_id,balance,total_earned) VALUES(caller,payout,payout) ON CONFLICT(user_id) DO UPDATE SET balance=coalesce(user_diamonds.balance,0)+payout,total_earned=coalesce(user_diamonds.total_earned,0)+payout;
   END IF;
   UPDATE public.lucky_chain_runs SET chain=run.chain,diamonds=run.diamonds,status=run.status,last_step_at=clock_timestamp(),updated_at=now() WHERE user_id=caller;
  END IF;
 END IF;
 RETURN jsonb_build_object('id',run.id,'chain',run.chain,'diamonds',run.diamonds,'status',run.status,'success',success,'reward',reward,'awarded',payout,'keys',(SELECT coalesce(sum(balance),0) FROM public.user_keys WHERE user_id=caller));
END $$;
REVOKE EXECUTE ON FUNCTION public.lucky_chain_action(text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lucky_chain_action(text,uuid,integer) TO authenticated;