-- $CsBv1 token system tables

-- Player wallet/balance + energy + claim cooldown
CREATE TABLE public.csbv1_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  total_earned BIGINT NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  energy_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_claim_at TIMESTAMPTZ,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.csbv1_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view players for leaderboard" ON public.csbv1_players FOR SELECT USING (true);
CREATE POLICY "Users can insert own player" ON public.csbv1_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own player" ON public.csbv1_players FOR UPDATE USING (auth.uid() = user_id);

-- Upgrades (reward boost, energy capacity, cooldown reduction)
CREATE TABLE public.csbv1_upgrades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upgrade_type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, upgrade_type)
);

ALTER TABLE public.csbv1_upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own upgrades" ON public.csbv1_upgrades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own upgrades" ON public.csbv1_upgrades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own upgrades" ON public.csbv1_upgrades FOR UPDATE USING (auth.uid() = user_id);

-- Daily mission progress
CREATE TABLE public.csbv1_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, reset_date)
);

ALTER TABLE public.csbv1_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own missions" ON public.csbv1_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.csbv1_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.csbv1_missions FOR UPDATE USING (auth.uid() = user_id);

-- NFT Power (per-NFT level upgrades)
CREATE TABLE public.csbv1_nft_power (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nft_id TEXT NOT NULL,
  nft_name TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, nft_id)
);

ALTER TABLE public.csbv1_nft_power ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own NFT power" ON public.csbv1_nft_power FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own NFT power" ON public.csbv1_nft_power FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own NFT power" ON public.csbv1_nft_power FOR UPDATE USING (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER csbv1_players_updated BEFORE UPDATE ON public.csbv1_players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER csbv1_upgrades_updated BEFORE UPDATE ON public.csbv1_upgrades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER csbv1_missions_updated BEFORE UPDATE ON public.csbv1_missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER csbv1_nft_power_updated BEFORE UPDATE ON public.csbv1_nft_power FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();