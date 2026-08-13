
-- 1. PROFILES: remove blanket read
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.safe_profiles()
RETURNS TABLE (id uuid, username text, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar_url, p.created_at FROM public.profiles p
$$;
REVOKE ALL ON FUNCTION public.safe_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.safe_profiles() TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
  SELECT id, username, avatar_url, created_at FROM public.safe_profiles();
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. LEADERBOARD VIEWS: replace SECURITY DEFINER view with invoker view over definer functions
CREATE OR REPLACE FUNCTION public.csb_leaderboard_rows()
RETURNS TABLE (user_id uuid, username text, avatar_url text, csb_tokens bigint, bulls_owned integer, total_diamonds bigint, rank bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH nft AS (
    SELECT b.user_id, max(COALESCE(b.csb_tokens, 0::bigint)) AS csb_tokens,
           max(COALESCE(b.bulls_owned, 0)) AS bulls_owned
    FROM public.user_nft_bonuses b GROUP BY b.user_id
  ), dia AS (
    SELECT d.user_id, max(COALESCE(d.balance, 0::bigint)) AS balance
    FROM public.user_diamonds d GROUP BY d.user_id
  )
  SELECT p.id, p.username, p.avatar_url,
         COALESCE(n.csb_tokens, 0::bigint),
         COALESCE(n.bulls_owned, 0),
         COALESCE(dd.balance, 0::bigint),
         row_number() OVER (ORDER BY COALESCE(n.csb_tokens, 0::bigint) DESC,
                                     COALESCE(n.bulls_owned, 0) DESC,
                                     COALESCE(dd.balance, 0::bigint) DESC)
  FROM public.profiles p
  LEFT JOIN nft n ON n.user_id = p.id
  LEFT JOIN dia dd ON dd.user_id = p.id
  ORDER BY 4 DESC, 5 DESC, 6 DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.csb_leaderboard_rows() FROM public;
GRANT EXECUTE ON FUNCTION public.csb_leaderboard_rows() TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.csb_leaderboard;
CREATE VIEW public.csb_leaderboard WITH (security_invoker = on) AS
  SELECT * FROM public.csb_leaderboard_rows();
GRANT SELECT ON public.csb_leaderboard TO anon, authenticated;

CREATE OR REPLACE VIEW public.csb_challengers WITH (security_invoker = on) AS
  WITH src AS (
    SELECT np.user_id, max(np.level) AS top_level, count(*) AS bulls_owned
    FROM public.csbv1_nft_power np WHERE np.nft_id LIKE 'csb\_%' GROUP BY np.user_id
    UNION ALL
    SELECT nb.user_id, 1, nb.bulls_owned::bigint
    FROM public.user_nft_bonuses nb WHERE nb.bulls_owned > 0
  )
  SELECT s.user_id,
         COALESCE(p.username, 'Bull Holder') AS username,
         max(s.top_level) AS top_level,
         max(s.bulls_owned) AS bulls_owned
  FROM src s LEFT JOIN public.public_profiles p ON p.id = s.user_id
  GROUP BY s.user_id, p.username;

CREATE OR REPLACE VIEW public.leaderboard WITH (security_invoker = on) AS
  SELECT p.id AS user_id, p.username, p.avatar_url,
         COALESCE(d.balance, 0::bigint) AS total_diamonds,
         COALESCE(g.total_games, 0::bigint) AS total_games,
         COALESCE(g.total_wins, 0::bigint) AS total_wins,
         row_number() OVER (ORDER BY COALESCE(d.balance, 0::bigint) DESC) AS rank
  FROM public.public_profiles p
  LEFT JOIN public.user_diamonds d ON d.user_id = p.id
  LEFT JOIN (
    SELECT gr.user_id, count(*) AS total_games,
           count(*) FILTER (WHERE gr.result = 'win') AS total_wins
    FROM public.game_results gr GROUP BY gr.user_id
  ) g ON g.user_id = p.id
  WHERE COALESCE(d.balance, 0::bigint) > 0
  ORDER BY 4 DESC
  LIMIT 100;

-- 3. GAME ROOM PLAYERS: no anonymous financial data
DROP POLICY IF EXISTS "Anyone can view room players" ON public.game_room_players;
CREATE POLICY "Authenticated can view room players"
ON public.game_room_players FOR SELECT TO authenticated USING (true);

-- 4. created_by spoofing
ALTER TABLE public.game_rooms ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.maze_tournaments ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create rooms"
ON public.game_rooms FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create tournaments" ON public.maze_tournaments;
CREATE POLICY "Authenticated users can create tournaments"
ON public.maze_tournaments FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators or members can update rooms" ON public.game_rooms;
CREATE POLICY "Creators or members can update rooms"
ON public.game_rooms FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.game_room_players grp WHERE grp.room_id = game_rooms.id AND grp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Creators or participants can update tournaments" ON public.maze_tournaments;
CREATE POLICY "Creators or participants can update tournaments"
ON public.maze_tournaments FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tournament_players tp WHERE tp.tournament_id = maze_tournaments.id AND tp.user_id = auth.uid())
);

-- 5. WORLD BOSSES: validated spawns/damage
CREATE OR REPLACE FUNCTION public.bw_validate_boss_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.bw_world_bosses b
               WHERE b.status = 'alive' AND b.despawn_at > now()) THEN
      RAISE EXCEPTION 'A world boss is already active';
    END IF;
    IF NEW.hp IS NULL OR NEW.hp <> NEW.max_hp OR NEW.hp <= 0 OR NEW.hp > 50000000 THEN
      RAISE EXCEPTION 'Invalid boss hp';
    END IF;
    IF NEW.level < 1 OR NEW.level > 200 THEN
      RAISE EXCEPTION 'Invalid boss level';
    END IF;
    NEW.status := 'alive';
    NEW.spawned_at := now();
    NEW.despawn_at := now() + interval '2 hours';
    RETURN NEW;
  END IF;

  -- UPDATE: only hp/status may change, hp may only decrease
  NEW.id := OLD.id;
  NEW.boss_key := OLD.boss_key;
  NEW.name := OLD.name;
  NEW.region := OLD.region;
  NEW.level := OLD.level;
  NEW.max_hp := OLD.max_hp;
  NEW.pos_x := OLD.pos_x;
  NEW.pos_y := OLD.pos_y;
  NEW.spawned_at := OLD.spawned_at;
  NEW.despawn_at := OLD.despawn_at;
  NEW.created_at := OLD.created_at;

  IF OLD.status <> 'alive' THEN
    RAISE EXCEPTION 'Boss is no longer active';
  END IF;
  IF NEW.hp > OLD.hp THEN
    RAISE EXCEPTION 'Boss hp cannot increase';
  END IF;
  IF OLD.hp - NEW.hp > GREATEST(1000, OLD.max_hp / 10) THEN
    RAISE EXCEPTION 'Damage exceeds allowed limit';
  END IF;
  IF NEW.status NOT IN ('alive', 'defeated') THEN
    RAISE EXCEPTION 'Invalid boss status';
  END IF;
  IF NEW.status = 'defeated' AND NEW.hp > 0 THEN
    RAISE EXCEPTION 'Boss is still alive';
  END IF;
  IF NEW.hp = 0 THEN
    NEW.status := 'defeated';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bw_validate_boss_write ON public.bw_world_bosses;
CREATE TRIGGER bw_validate_boss_write
BEFORE INSERT OR UPDATE ON public.bw_world_bosses
FOR EACH ROW EXECUTE FUNCTION public.bw_validate_boss_write();

-- 6. WORLD PLAYERS: scope policies to authenticated
DROP POLICY IF EXISTS "Users can view all online players" ON public.world_players;
DROP POLICY IF EXISTS "Users can insert own position" ON public.world_players;
DROP POLICY IF EXISTS "Users can update own position" ON public.world_players;
DROP POLICY IF EXISTS "Users can delete own position" ON public.world_players;

CREATE POLICY "Authenticated can view online players"
ON public.world_players FOR SELECT TO authenticated USING (is_online = true);
CREATE POLICY "Users can insert own position"
ON public.world_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own position"
ON public.world_players FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own position"
ON public.world_players FOR DELETE TO authenticated USING (auth.uid() = user_id);
