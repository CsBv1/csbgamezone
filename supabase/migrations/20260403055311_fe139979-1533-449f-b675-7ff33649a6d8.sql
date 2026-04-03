CREATE TABLE public.daily_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  reward_type text NOT NULL DEFAULT 'diamonds',
  reward_amount integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

ALTER TABLE public.daily_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
ON public.daily_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
ON public.daily_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);