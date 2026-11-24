CREATE TABLE public.wallet_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text NOT NULL CHECK (chain IN ('cardano','solana','ethereum','base','bitcoin')),
  address text NOT NULL,
  nonce text NOT NULL,
  message text NOT NULL,
  link_user_id uuid,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_login_challenges_lookup ON public.wallet_login_challenges(chain, address, nonce);
GRANT ALL ON public.wallet_login_challenges TO service_role;
ALTER TABLE public.wallet_login_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wallet_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chain text NOT NULL CHECK (chain IN ('cardano','solana','ethereum','base','bitcoin')),
  address text NOT NULL,
  extra_address text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, address)
);
CREATE INDEX wallet_identities_user ON public.wallet_identities(user_id);
GRANT SELECT ON public.wallet_identities TO authenticated;
GRANT ALL ON public.wallet_identities TO service_role;
ALTER TABLE public.wallet_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wallets readable" ON public.wallet_identities FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.bull_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text NOT NULL CHECK (chain IN ('solana','ethereum','base','bitcoin')),
  collection_id text NOT NULL,
  name text NOT NULL DEFAULT 'Cardano Stake Bulls',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, collection_id)
);
GRANT SELECT ON public.bull_collections TO anon, authenticated;
GRANT ALL ON public.bull_collections TO service_role;
ALTER TABLE public.bull_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections are public" ON public.bull_collections FOR SELECT USING (true);

ALTER TABLE public.user_nft_bonuses ADD COLUMN IF NOT EXISTS other_chain_bulls integer NOT NULL DEFAULT 0;