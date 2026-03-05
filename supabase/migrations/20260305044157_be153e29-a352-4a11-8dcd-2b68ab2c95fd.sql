-- Holder seasons
CREATE TABLE IF NOT EXISTS public.holder_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  weekly_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.holder_seasons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'holder_seasons'
      AND policyname = 'Anyone can view holder seasons'
  ) THEN
    CREATE POLICY "Anyone can view holder seasons"
    ON public.holder_seasons
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Holder season points
CREATE TABLE IF NOT EXISTS public.holder_season_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.holder_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  diamonds_earned INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);

ALTER TABLE public.holder_season_points ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'holder_season_points'
      AND policyname = 'Anyone can view holder season points'
  ) THEN
    CREATE POLICY "Anyone can view holder season points"
    ON public.holder_season_points
    FOR SELECT
    USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_holder_season_points_season_points
  ON public.holder_season_points (season_id, points DESC);

CREATE INDEX IF NOT EXISTS idx_holder_season_points_user
  ON public.holder_season_points (user_id);

-- Timestamp triggers
DROP TRIGGER IF EXISTS trg_holder_seasons_updated_at ON public.holder_seasons;
CREATE TRIGGER trg_holder_seasons_updated_at
BEFORE UPDATE ON public.holder_seasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_holder_season_points_updated_at ON public.holder_season_points;
CREATE TRIGGER trg_holder_season_points_updated_at
BEFORE UPDATE ON public.holder_season_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Keep points synced from game results
CREATE OR REPLACE FUNCTION public.add_holder_season_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_season_id UUID;
  earned_points INTEGER;
BEGIN
  IF NEW.diamonds_won IS NULL OR NEW.diamonds_won <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO active_season_id
  FROM public.holder_seasons
  WHERE is_active = true
    AND starts_at <= now()
    AND ends_at > now()
  ORDER BY starts_at DESC
  LIMIT 1;

  IF active_season_id IS NULL THEN
    INSERT INTO public.holder_seasons (
      name,
      starts_at,
      ends_at,
      is_active,
      weekly_summary
    ) VALUES (
      'Season ' || to_char(now(), 'IYYY-"W"IW'),
      date_trunc('week', now()),
      date_trunc('week', now()) + interval '7 days',
      true,
      'Weekly holder season is now live.'
    )
    RETURNING id INTO active_season_id;
  END IF;

  earned_points := GREATEST(1, FLOOR(NEW.diamonds_won / 10.0));

  INSERT INTO public.holder_season_points (
    season_id,
    user_id,
    points,
    diamonds_earned,
    games_played
  ) VALUES (
    active_season_id,
    NEW.user_id,
    earned_points,
    NEW.diamonds_won,
    1
  )
  ON CONFLICT (season_id, user_id)
  DO UPDATE SET
    points = public.holder_season_points.points + EXCLUDED.points,
    diamonds_earned = public.holder_season_points.diamonds_earned + EXCLUDED.diamonds_earned,
    games_played = public.holder_season_points.games_played + EXCLUDED.games_played,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_holder_season_points ON public.game_results;
CREATE TRIGGER trg_add_holder_season_points
AFTER INSERT ON public.game_results
FOR EACH ROW
EXECUTE FUNCTION public.add_holder_season_points();

-- Seed an active season if one does not exist
INSERT INTO public.holder_seasons (name, starts_at, ends_at, is_active, weekly_summary)
SELECT
  'Season ' || to_char(now(), 'IYYY-"W"IW'),
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days',
  true,
  'Holders Season is live. Earn points by winning diamonds in games!'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.holder_seasons
  WHERE is_active = true
    AND ends_at > now()
);