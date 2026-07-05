
DROP POLICY IF EXISTS "Public can view players for leaderboard" ON public.csbv1_players;
CREATE POLICY "Authenticated can view players for leaderboard"
  ON public.csbv1_players FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can view game results for leaderboard" ON public.game_results;
CREATE POLICY "Authenticated can view game results for leaderboard"
  ON public.game_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can view bukals for leaderboard" ON public.user_bukals;
CREATE POLICY "Authenticated can view bukals for leaderboard"
  ON public.user_bukals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can view diamond stats for leaderboard" ON public.user_diamonds;
CREATE POLICY "Authenticated can view diamond stats for leaderboard"
  ON public.user_diamonds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can view bulls owned for leaderboard" ON public.user_nft_bonuses;
CREATE POLICY "Authenticated can view bulls owned for leaderboard"
  ON public.user_nft_bonuses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public can view usernames and avatars" ON public.profiles;
DROP POLICY IF EXISTS "Public can view limited profile data" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.game_rooms;
CREATE POLICY "Creators or members can update rooms"
  ON public.game_rooms FOR UPDATE TO authenticated
  USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.game_room_players grp WHERE grp.room_id = game_rooms.id AND grp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.maze_tournaments ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON public.maze_tournaments;
CREATE POLICY "Creators or participants can update tournaments"
  ON public.maze_tournaments FOR UPDATE TO authenticated
  USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tournament_players tp WHERE tp.tournament_id = maze_tournaments.id AND tp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.maze_tournaments;
CREATE POLICY "Authenticated users can create tournaments"
  ON public.maze_tournaments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_chat_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_holder_season_points() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_wallet_auth(text, text, text) TO anon, authenticated;

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  BEGIN EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "Authenticated can read realtime" ON realtime.messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN EXECUTE 'CREATE POLICY "Authenticated can write realtime" ON realtime.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)'; EXCEPTION WHEN others THEN NULL; END;
END $$;
