
CREATE TABLE public.user_runes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rune_id text NOT NULL,
  rune_name text NOT NULL,
  rune_symbol text NOT NULL,
  credit_cost integer NOT NULL,
  active boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, rune_id)
);

ALTER TABLE public.user_runes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runes" ON public.user_runes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can view active runes for leaderboard" ON public.user_runes FOR SELECT USING (active = true);
CREATE POLICY "Users can insert own runes" ON public.user_runes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own runes" ON public.user_runes FOR UPDATE USING (auth.uid() = user_id);
