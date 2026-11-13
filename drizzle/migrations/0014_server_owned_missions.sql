CREATE OR REPLACE FUNCTION public.csb_mission_def(_id text, OUT cost integer, OUT reward integer, OUT goal integer)
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT c.cost, c.reward, c.goal FROM (VALUES
   ('easy_action',5,5,1),('easy_double',8,10,2),('med_energy',20,15,1),
   ('med_combo',15,25,5),('hard_three',30,50,3),('hard_grind',40,80,10)
  ) AS c(id,cost,reward,goal) WHERE c.id=_id
$$;

CREATE OR REPLACE FUNCTION public.csb_mission_step(_mission text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid:=auth.uid(); m record; p public.csbv1_players; cur_energy integer; d date:=(now() AT TIME ZONE 'utc')::date; row public.csbv1_missions;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.csb_mission_def(_mission);
  IF m.goal IS NULL THEN RAISE EXCEPTION 'Invalid mission' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
  SELECT * INTO p FROM public.csbv1_players WHERE user_id=caller FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Player unavailable' USING ERRCODE='22023'; END IF;
  cur_energy := LEAST(p.max_energy, p.energy + floor(extract(epoch FROM now()-p.energy_updated_at)/60)::integer);
  IF cur_energy < m.cost THEN RAISE EXCEPTION 'Not enough energy' USING ERRCODE='22023'; END IF;
  SELECT * INTO row FROM public.csbv1_missions WHERE user_id=caller AND mission_id=_mission AND reset_date=d FOR UPDATE;
  IF row.completed THEN RAISE EXCEPTION 'Mission already complete' USING ERRCODE='22023'; END IF;
  UPDATE public.csbv1_players SET energy=cur_energy-m.cost, energy_updated_at=now() WHERE user_id=caller;
  INSERT INTO public.csbv1_missions(user_id,mission_id,reset_date,progress,completed,claimed)
  VALUES(caller,_mission,d,1,1>=m.goal,false)
  ON CONFLICT(user_id,mission_id,reset_date) DO UPDATE SET progress=LEAST(m.goal,csbv1_missions.progress+1),
    completed=csbv1_missions.progress+1>=m.goal
  RETURNING * INTO row;
  RETURN jsonb_build_object('progress',row.progress,'completed',row.completed,'goal',m.goal,'energy',cur_energy-m.cost);
END $$;

CREATE OR REPLACE FUNCTION public.csb_claim_mission(_mission text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid:=auth.uid(); m record; p public.csbv1_players; d date:=(now() AT TIME ZONE 'utc')::date; row public.csbv1_missions; streak integer; pay integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.csb_mission_def(_mission);
  IF m.goal IS NULL THEN RAISE EXCEPTION 'Invalid mission' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
  SELECT * INTO row FROM public.csbv1_missions WHERE user_id=caller AND mission_id=_mission AND reset_date=d FOR UPDATE;
  IF row.id IS NULL OR NOT row.completed OR row.progress < m.goal THEN RAISE EXCEPTION 'Mission not complete' USING ERRCODE='22023'; END IF;
  IF row.claimed THEN RAISE EXCEPTION 'Already claimed' USING ERRCODE='22023'; END IF;
  SELECT * INTO p FROM public.csbv1_players WHERE user_id=caller FOR UPDATE;
  streak := COALESCE(p.streak_days,0);
  IF p.last_streak_date IS DISTINCT FROM d THEN
    streak := CASE WHEN p.last_streak_date = d - 1 THEN streak + 1 ELSE 1 END;
  END IF;
  pay := floor(m.reward * (1 + LEAST(COALESCE(p.streak_days,0)*0.05, 0.5)));
  UPDATE public.csbv1_missions SET claimed=true WHERE id=row.id;
  UPDATE public.csbv1_players SET balance=balance+pay, total_earned=total_earned+pay,
    streak_days=streak, last_streak_date=d WHERE user_id=caller;
  RETURN jsonb_build_object('reward',pay,'streak',streak);
END $$;

REVOKE EXECUTE ON FUNCTION public.csb_mission_step(text), public.csb_claim_mission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csb_mission_step(text), public.csb_claim_mission(text) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.csbv1_missions FROM authenticated, anon;
GRANT ALL ON public.csbv1_missions TO service_role;