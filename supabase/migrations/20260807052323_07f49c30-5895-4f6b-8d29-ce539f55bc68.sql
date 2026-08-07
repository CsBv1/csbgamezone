CREATE TABLE public.bw_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bull_nft_id TEXT,
  bull_name TEXT NOT NULL DEFAULT 'Guest Bull',
  bull_image TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  skill_points INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  attack INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 5,
  crit_chance NUMERIC NOT NULL DEFAULT 5,
  move_speed NUMERIC NOT NULL DEFAULT 5,
  luck INTEGER NOT NULL DEFAULT 1,
  mining INTEGER NOT NULL DEFAULT 1,
  fishing INTEGER NOT NULL DEFAULT 1,
  crafting INTEGER NOT NULL DEFAULT 1,
  woodcutting INTEGER NOT NULL DEFAULT 1,
  magic INTEGER NOT NULL DEFAULT 1,
  weapon TEXT NOT NULL DEFAULT 'sword',
  gold INTEGER NOT NULL DEFAULT 0,
  region TEXT NOT NULL DEFAULT 'bull-city',
  pos_x REAL NOT NULL DEFAULT 6000,
  pos_y REAL NOT NULL DEFAULT 4000,
  discovered_regions JSONB NOT NULL DEFAULT '["bull-city"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bw_characters TO authenticated;
GRANT ALL ON public.bw_characters TO service_role;
ALTER TABLE public.bw_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own character select" ON public.bw_characters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own character insert" ON public.bw_characters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own character update" ON public.bw_characters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER bw_characters_updated BEFORE UPDATE ON public.bw_characters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bw_world_bosses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boss_key TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 10,
  hp BIGINT NOT NULL,
  max_hp BIGINT NOT NULL,
  pos_x REAL NOT NULL,
  pos_y REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'alive',
  spawned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  despawn_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '2 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bw_world_bosses TO authenticated;
GRANT ALL ON public.bw_world_bosses TO service_role;
ALTER TABLE public.bw_world_bosses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bosses visible to players" ON public.bw_world_bosses FOR SELECT TO authenticated USING (true);
CREATE POLICY "players can spawn bosses" ON public.bw_world_bosses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "players can damage bosses" ON public.bw_world_bosses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER bw_world_bosses_updated BEFORE UPDATE ON public.bw_world_bosses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bw_boss_damage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boss_id UUID NOT NULL REFERENCES public.bw_world_bosses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT,
  damage BIGINT NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boss_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.bw_boss_damage TO authenticated;
GRANT ALL ON public.bw_boss_damage TO service_role;
ALTER TABLE public.bw_boss_damage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boss damage visible" ON public.bw_boss_damage FOR SELECT TO authenticated USING (true);
CREATE POLICY "own boss damage insert" ON public.bw_boss_damage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own boss damage update" ON public.bw_boss_damage FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER bw_boss_damage_updated BEFORE UPDATE ON public.bw_boss_damage
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bw_bosses_status ON public.bw_world_bosses (status, region);
CREATE INDEX idx_bw_boss_damage_boss ON public.bw_boss_damage (boss_id, damage DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bw_world_bosses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bw_boss_damage;