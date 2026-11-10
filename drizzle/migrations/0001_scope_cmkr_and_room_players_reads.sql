CREATE OR REPLACE FUNCTION public.cmkr_month_board(_month text)
RETURNS TABLE(user_id uuid, username text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.user_id, (array_agg(e.username ORDER BY e.created_at DESC) FILTER (WHERE e.username IS NOT NULL))[1], SUM(e.amount)::bigint
  FROM public.cmkr_earnings e WHERE e.month = _month GROUP BY e.user_id
$$;
REVOKE ALL ON FUNCTION public.cmkr_month_board(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cmkr_month_board(text) TO authenticated;

DROP POLICY IF EXISTS "Signed in users can view CMKR earnings" ON public.cmkr_earnings;
CREATE POLICY "Users view own CMKR earnings" ON public.cmkr_earnings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.can_view_room_players(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.game_room_players p WHERE p.room_id = _room_id AND p.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.game_rooms r WHERE r.id = _room_id
                 AND (r.created_by = auth.uid() OR r.status = 'waiting' OR r.round_data->>'target_id' = auth.uid()::text))
$$;
REVOKE ALL ON FUNCTION public.can_view_room_players(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_room_players(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view room players" ON public.game_room_players;
CREATE POLICY "Room members can view room players" ON public.game_room_players
FOR SELECT TO authenticated USING (public.can_view_room_players(room_id));