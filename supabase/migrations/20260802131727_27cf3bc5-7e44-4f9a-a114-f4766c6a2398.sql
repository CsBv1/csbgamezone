GRANT INSERT, UPDATE ON public.csb_battle_states TO authenticated;

CREATE POLICY "Host can initialize battle state"
ON public.csb_battle_states
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = host_user_id
  AND EXISTS (
    SELECT 1 FROM public.game_rooms r
    WHERE r.id = room_id AND r.created_by = auth.uid() AND r.game_type = 'csb-battle'
  )
  AND EXISTS (
    SELECT 1 FROM public.game_room_players p
    WHERE p.room_id = csb_battle_states.room_id AND p.user_id = guest_user_id AND p.is_active = true
  )
);

CREATE POLICY "Participant can request own turn action"
ON public.csb_battle_states
FOR UPDATE
TO authenticated
USING (
  status = 'active'
  AND turn_user_id = auth.uid()
  AND (auth.uid() = host_user_id OR auth.uid() = guest_user_id)
)
WITH CHECK (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE OR REPLACE FUNCTION public.csb_validate_battle_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _actor jsonb;
  _target jsonb;
  _actor_is_host boolean;
  _damage integer := 0;
  _heal integer := 0;
  _crit boolean := false;
  _actor_name text;
  _message text;
BEGIN
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;
  IF OLD.status <> 'active' OR OLD.turn_user_id <> auth.uid() THEN RAISE EXCEPTION 'It is not your turn'; END IF;
  IF NEW.room_id <> OLD.room_id OR NEW.host_user_id <> OLD.host_user_id OR NEW.guest_user_id <> OLD.guest_user_id THEN RAISE EXCEPTION 'Battle participants cannot be changed'; END IF;

  _action := NEW.last_action->>'request';
  IF _action NOT IN ('attack', 'special', 'defend') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  _actor_is_host := auth.uid() = OLD.host_user_id;
  _actor := CASE WHEN _actor_is_host THEN OLD.host_fighter ELSE OLD.guest_fighter END;
  _target := CASE WHEN _actor_is_host THEN OLD.guest_fighter ELSE OLD.host_fighter END;
  _actor_name := COALESCE(_actor->>'name', 'Bull');

  IF _action = 'attack' THEN
    _crit := random() * 100 < COALESCE((_actor->>'critChance')::numeric, 5);
    _damage := GREATEST(5, FLOOR(COALESCE((_actor->>'attack')::numeric, 20) - COALESCE((_target->>'defense')::numeric, 10) / 2 + random() * 10)::integer);
    IF _crit THEN _damage := FLOOR(_damage * 1.8)::integer; END IF;
    _target := jsonb_set(_target, '{hp}', to_jsonb(GREATEST(0, COALESCE((_target->>'hp')::integer, 0) - _damage)));
    _actor := jsonb_set(_actor, '{specialReady}', to_jsonb(LEAST(100, COALESCE((_actor->>'specialReady')::integer, 0) + 20)));
    _message := CASE WHEN _crit THEN '💥 CRITICAL! ' ELSE '⚔️ ' END || _actor_name || ' attacks for ' || _damage || '!';
  ELSIF _action = 'special' THEN
    IF COALESCE((_actor->>'specialReady')::integer, 0) < 100 THEN RAISE EXCEPTION 'Special is not ready'; END IF;
    _damage := FLOOR(COALESCE((_actor->>'special')::numeric, 20) * 2.5 + random() * 20)::integer;
    _target := jsonb_set(_target, '{hp}', to_jsonb(GREATEST(0, COALESCE((_target->>'hp')::integer, 0) - _damage)));
    _actor := jsonb_set(_actor, '{specialReady}', '0'::jsonb);
    _message := '🌟 SPECIAL STRIKE! ' || _actor_name || ' deals ' || _damage || '!';
  ELSE
    _heal := FLOOR(COALESCE((_actor->>'defense')::numeric, 10) * 0.5 + 5)::integer;
    _actor := jsonb_set(_actor, '{hp}', to_jsonb(LEAST(COALESCE((_actor->>'maxHp')::integer, 1), COALESCE((_actor->>'hp')::integer, 0) + _heal)));
    _actor := jsonb_set(_actor, '{specialReady}', to_jsonb(LEAST(100, COALESCE((_actor->>'specialReady')::integer, 0) + 10)));
    _message := '🛡️ ' || _actor_name || ' defends and heals ' || _heal || '!';
  END IF;

  NEW.host_fighter := CASE WHEN _actor_is_host THEN _actor ELSE _target END;
  NEW.guest_fighter := CASE WHEN _actor_is_host THEN _target ELSE _actor END;
  NEW.turn_user_id := CASE WHEN _actor_is_host THEN OLD.guest_user_id ELSE OLD.host_user_id END;
  NEW.status := CASE
    WHEN COALESCE((_target->>'hp')::integer, 0) <= 0 THEN CASE WHEN _actor_is_host THEN 'host_won' ELSE 'guest_won' END
    ELSE 'active'
  END;
  NEW.version := OLD.version + 1;
  NEW.last_action := jsonb_build_object('type', _action, 'actor_id', auth.uid(), 'damage', _damage, 'heal', _heal, 'crit', _crit, 'message', _message);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.csb_validate_battle_action() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.csb_validate_battle_action() TO service_role;

CREATE TRIGGER validate_csb_battle_action
BEFORE UPDATE ON public.csb_battle_states
FOR EACH ROW EXECUTE FUNCTION public.csb_validate_battle_action();

CREATE OR REPLACE FUNCTION public.csb_start_battle(
  _room_id uuid,
  _host_fighter jsonb,
  _guest_fighter jsonb
) RETURNS public.csb_battle_states
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _room public.game_rooms;
  _guest_id uuid;
  _state public.csb_battle_states;
BEGIN
  SELECT * INTO _room FROM public.game_rooms WHERE id = _room_id;
  IF _room.id IS NULL OR _room.game_type <> 'csb-battle' OR auth.uid() <> _room.created_by THEN RAISE EXCEPTION 'Invalid battle room'; END IF;
  SELECT user_id INTO _guest_id FROM public.game_room_players
  WHERE room_id = _room_id AND user_id <> _room.created_by AND is_active = true ORDER BY joined_at LIMIT 1;
  IF _guest_id IS NULL THEN RAISE EXCEPTION 'Opponent has not joined'; END IF;
  INSERT INTO public.csb_battle_states (room_id, host_user_id, guest_user_id, host_fighter, guest_fighter, turn_user_id, last_action)
  VALUES (_room_id, _room.created_by, _guest_id, _host_fighter, _guest_fighter, _room.created_by, jsonb_build_object('type','start','message','Battle started'))
  RETURNING * INTO _state;
  RETURN _state;
END;
$$;

CREATE OR REPLACE FUNCTION public.csb_apply_battle_action(_room_id uuid, _action text)
RETURNS public.csb_battle_states
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE _state public.csb_battle_states;
BEGIN
  UPDATE public.csb_battle_states
  SET last_action = jsonb_build_object('request', _action)
  WHERE room_id = _room_id
  RETURNING * INTO _state;
  IF _state.room_id IS NULL THEN RAISE EXCEPTION 'Battle unavailable or not your turn'; END IF;
  RETURN _state;
END;
$$;

REVOKE ALL ON FUNCTION public.csb_start_battle(uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.csb_apply_battle_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csb_start_battle(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.csb_apply_battle_action(uuid, text) TO authenticated;