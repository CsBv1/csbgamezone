CREATE TABLE public.csb_battle_states (
  room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_fighter jsonb NOT NULL,
  guest_fighter jsonb NOT NULL,
  turn_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'host_won', 'guest_won')),
  version integer NOT NULL DEFAULT 0,
  last_action jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.csb_battle_states TO authenticated;
GRANT ALL ON public.csb_battle_states TO service_role;

ALTER TABLE public.csb_battle_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battle participants can view shared state"
ON public.csb_battle_states
FOR SELECT
TO authenticated
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE OR REPLACE FUNCTION public.csb_start_battle(
  _room_id uuid,
  _host_fighter jsonb,
  _guest_fighter jsonb
) RETURNS public.csb_battle_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room public.game_rooms;
  _guest_id uuid;
  _state public.csb_battle_states;
BEGIN
  SELECT * INTO _room FROM public.game_rooms WHERE id = _room_id FOR UPDATE;
  IF _room.id IS NULL OR _room.game_type <> 'csb-battle' THEN RAISE EXCEPTION 'Invalid battle room'; END IF;
  IF auth.uid() <> _room.created_by THEN RAISE EXCEPTION 'Only the challenger can initialize this battle'; END IF;
  SELECT user_id INTO _guest_id FROM public.game_room_players
  WHERE room_id = _room_id AND user_id <> _room.created_by AND is_active = true
  ORDER BY joined_at LIMIT 1;
  IF _guest_id IS NULL THEN RAISE EXCEPTION 'Opponent has not joined'; END IF;

  INSERT INTO public.csb_battle_states (
    room_id, host_user_id, guest_user_id, host_fighter, guest_fighter, turn_user_id, last_action
  ) VALUES (
    _room_id, _room.created_by, _guest_id, _host_fighter, _guest_fighter, _room.created_by,
    jsonb_build_object('type', 'start', 'message', 'Battle started')
  )
  ON CONFLICT (room_id) DO UPDATE SET
    host_user_id = EXCLUDED.host_user_id,
    guest_user_id = EXCLUDED.guest_user_id,
    host_fighter = EXCLUDED.host_fighter,
    guest_fighter = EXCLUDED.guest_fighter,
    turn_user_id = EXCLUDED.host_user_id,
    status = 'active', version = 0,
    last_action = jsonb_build_object('type', 'start', 'message', 'Battle started'),
    updated_at = now()
  RETURNING * INTO _state;
  RETURN _state;
END;
$$;

CREATE OR REPLACE FUNCTION public.csb_apply_battle_action(
  _room_id uuid,
  _action text
) RETURNS public.csb_battle_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state public.csb_battle_states;
  _actor jsonb;
  _target jsonb;
  _actor_is_host boolean;
  _damage integer := 0;
  _heal integer := 0;
  _crit boolean := false;
  _actor_name text;
  _message text;
  _winner_status text;
BEGIN
  IF _action NOT IN ('attack', 'special', 'defend') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  SELECT * INTO _state FROM public.csb_battle_states WHERE room_id = _room_id FOR UPDATE;
  IF _state.room_id IS NULL OR _state.status <> 'active' THEN RAISE EXCEPTION 'Battle is not active'; END IF;
  IF auth.uid() <> _state.turn_user_id THEN RAISE EXCEPTION 'It is not your turn'; END IF;

  _actor_is_host := auth.uid() = _state.host_user_id;
  _actor := CASE WHEN _actor_is_host THEN _state.host_fighter ELSE _state.guest_fighter END;
  _target := CASE WHEN _actor_is_host THEN _state.guest_fighter ELSE _state.host_fighter END;
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

  IF COALESCE((_target->>'hp')::integer, 0) <= 0 THEN
    _winner_status := CASE WHEN _actor_is_host THEN 'host_won' ELSE 'guest_won' END;
  ELSE
    _winner_status := 'active';
  END IF;

  UPDATE public.csb_battle_states SET
    host_fighter = CASE WHEN _actor_is_host THEN _actor ELSE _target END,
    guest_fighter = CASE WHEN _actor_is_host THEN _target ELSE _actor END,
    turn_user_id = CASE WHEN _actor_is_host THEN guest_user_id ELSE host_user_id END,
    status = _winner_status,
    version = version + 1,
    last_action = jsonb_build_object('type', _action, 'actor_id', auth.uid(), 'damage', _damage, 'heal', _heal, 'crit', _crit, 'message', _message),
    updated_at = now()
  WHERE room_id = _room_id
  RETURNING * INTO _state;
  RETURN _state;
END;
$$;

REVOKE ALL ON FUNCTION public.csb_start_battle(uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.csb_apply_battle_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csb_start_battle(uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.csb_apply_battle_action(uuid, text) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.csb_battle_states;