CREATE OR REPLACE FUNCTION public.guard_profile_wallet()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.wallet_address := NULL;
    ELSIF NEW.wallet_address IS DISTINCT FROM OLD.wallet_address THEN
      IF OLD.wallet_address IS NOT NULL
         OR NEW.wallet_address IS NULL
         OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.wallet_address = NEW.wallet_address AND p.id <> OLD.id) THEN
        RAISE EXCEPTION 'This wallet cannot be linked to your account';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_profile_wallet() FROM PUBLIC, anon, authenticated;