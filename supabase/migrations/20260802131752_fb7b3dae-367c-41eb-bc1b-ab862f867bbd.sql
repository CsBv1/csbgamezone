DROP POLICY "Host can initialize battle state" ON public.csb_battle_states;
CREATE POLICY "Participants can initialize battle state"
ON public.csb_battle_states
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms r
    WHERE r.id = room_id
      AND r.game_type = 'csb-battle'
      AND r.created_by = host_user_id
      AND (r.created_by = auth.uid() OR r.round_data->>'target_id' = auth.uid()::text)
  )
  AND EXISTS (
    SELECT 1 FROM public.game_room_players p
    WHERE p.room_id = csb_battle_states.room_id
      AND p.user_id = guest_user_id
      AND p.is_active = true
  )
);

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
  IF _room.id IS NULL OR _room.game_type <> 'csb-battle' THEN RAISE EXCEPTION 'Invalid battle room'; END IF;
  IF auth.uid() <> _room.created_by AND _room.round_data->>'target_id' <> auth.uid()::text THEN RAISE EXCEPTION 'Not a battle participant'; END IF;
  SELECT user_id INTO _guest_id FROM public.game_room_players
  WHERE room_id = _room_id AND user_id <> _room.created_by AND is_active = true ORDER BY joined_at LIMIT 1;
  IF _guest_id IS NULL THEN RAISE EXCEPTION 'Opponent has not joined'; END IF;

  INSERT INTO public.csb_battle_states (room_id, host_user_id, guest_user_id, host_fighter, guest_fighter, turn_user_id, last_action)
  VALUES (_room_id, _room.created_by, _guest_id, _host_fighter, _guest_fighter, _room.created_by, jsonb_build_object('type','start','message','Battle started'))
  ON CONFLICT (room_id) DO NOTHING
  RETURNING * INTO _state;
  IF _state.room_id IS NULL THEN SELECT * INTO _state FROM public.csb_battle_states WHERE room_id = _room_id; END IF;
  RETURN _state;
END;
$$;