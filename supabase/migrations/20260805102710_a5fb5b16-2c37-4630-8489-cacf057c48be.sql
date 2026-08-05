CREATE TABLE public.csb_tcg_states (
  room_id uuid PRIMARY KEY REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL,
  guest_user_id uuid NOT NULL,
  turn_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 0,
  board jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_action jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.csb_tcg_states TO authenticated;
GRANT ALL ON public.csb_tcg_states TO service_role;

ALTER TABLE public.csb_tcg_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their TCG match"
ON public.csb_tcg_states FOR SELECT TO authenticated
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Participants can create their TCG match"
ON public.csb_tcg_states FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Participants can update their TCG match"
ON public.csb_tcg_states FOR UPDATE TO authenticated
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id)
WITH CHECK (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE OR REPLACE FUNCTION public.csb_tcg_validate_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status <> 'active' THEN RAISE EXCEPTION 'Match already finished'; END IF;
  IF auth.uid() <> OLD.turn_user_id THEN RAISE EXCEPTION 'It is not your turn'; END IF;
  IF NEW.room_id <> OLD.room_id OR NEW.host_user_id <> OLD.host_user_id OR NEW.guest_user_id <> OLD.guest_user_id THEN
    RAISE EXCEPTION 'Match participants cannot be changed';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER csb_tcg_validate_update
BEFORE UPDATE ON public.csb_tcg_states
FOR EACH ROW EXECUTE FUNCTION public.csb_tcg_validate_update();

CREATE TABLE public.csb_tcg_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);

GRANT SELECT, INSERT, UPDATE ON public.csb_tcg_cards TO authenticated;
GRANT ALL ON public.csb_tcg_cards TO service_role;

ALTER TABLE public.csb_tcg_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
ON public.csb_tcg_cards FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own cards"
ON public.csb_tcg_cards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
ON public.csb_tcg_cards FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER csb_tcg_cards_updated
BEFORE UPDATE ON public.csb_tcg_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.csb_tcg_states;