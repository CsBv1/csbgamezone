CREATE UNIQUE INDEX IF NOT EXISTS user_nft_bonuses_user_id_key ON public.user_nft_bonuses(user_id);

DROP POLICY IF EXISTS "Users can insert own NFT bonuses" ON public.user_nft_bonuses;
DROP POLICY IF EXISTS "Users can update own NFT bonuses" ON public.user_nft_bonuses;
REVOKE INSERT, UPDATE ON public.user_nft_bonuses FROM authenticated, anon;
GRANT ALL ON public.user_nft_bonuses TO service_role;

-- Players cannot point their profile at someone else's wallet.
CREATE OR REPLACE FUNCTION public.guard_profile_wallet()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.wallet_address := NULL;
    ELSIF NEW.wallet_address IS DISTINCT FROM OLD.wallet_address THEN
      NEW.wallet_address := OLD.wallet_address;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_wallet ON public.profiles;
CREATE TRIGGER guard_profile_wallet BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_wallet();

-- Cap how much keys / bukals can grow in one save from the browser.
CREATE OR REPLACE FUNCTION public.guard_small_balance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cap integer := TG_ARGV[0]::integer;
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.balance < 0 THEN RAISE EXCEPTION 'Balance cannot be negative'; END IF;
    IF TG_OP = 'INSERT' AND NEW.balance > cap THEN NEW.balance := 0; END IF;
    IF TG_OP = 'UPDATE' AND NEW.balance - OLD.balance > cap THEN
      RAISE EXCEPTION 'Reward too large';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_keys ON public.user_keys;
CREATE TRIGGER guard_keys BEFORE INSERT OR UPDATE ON public.user_keys
FOR EACH ROW EXECUTE FUNCTION public.guard_small_balance('10');
DROP TRIGGER IF EXISTS guard_bukals ON public.user_bukals;
CREATE TRIGGER guard_bukals BEFORE INSERT OR UPDATE ON public.user_bukals
FOR EACH ROW EXECUTE FUNCTION public.guard_small_balance('5');

-- Rune Power players: cap gains per save, energy within limits.
CREATE OR REPLACE FUNCTION public.guard_csbv1_player()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.balance < 0 THEN RAISE EXCEPTION 'Balance cannot be negative'; END IF;
    NEW.max_energy := LEAST(GREATEST(NEW.max_energy, 1), 500);
    NEW.energy := LEAST(GREATEST(NEW.energy, 0), NEW.max_energy);
    IF TG_OP = 'INSERT' THEN
      NEW.balance := LEAST(NEW.balance, 1000);
      NEW.total_earned := NEW.balance;
    ELSE
      IF NEW.balance - OLD.balance > 50000 THEN RAISE EXCEPTION 'Reward too large'; END IF;
      IF NEW.total_earned < OLD.total_earned OR NEW.total_earned - OLD.total_earned > 50000 THEN
        NEW.total_earned := OLD.total_earned + GREATEST(NEW.balance - OLD.balance, 0);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_csbv1_player ON public.csbv1_players;
CREATE TRIGGER guard_csbv1_player BEFORE INSERT OR UPDATE ON public.csbv1_players
FOR EACH ROW EXECUTE FUNCTION public.guard_csbv1_player();

REVOKE EXECUTE ON FUNCTION public.guard_profile_wallet(), public.guard_small_balance(), public.guard_csbv1_player() FROM PUBLIC, anon, authenticated;