CREATE OR REPLACE FUNCTION public.handle_wallet_auth(_wallet_address text, _wallet_name text, _nickname text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _user_id UUID;
BEGIN
  IF _wallet_address IS NULL OR length(_wallet_address) < 20 OR length(_wallet_address) > 200 THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  SELECT id INTO _user_id FROM public.profiles WHERE wallet_address = _wallet_address;
  IF _user_id IS NULL THEN
    INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000',gen_random_uuid(),'authenticated','authenticated',_wallet_address || '@cardano.wallet',crypt('wallet_auth_' || _wallet_address, gen_salt('bf')),NOW(),NOW(),'{"provider":"cardano","providers":["cardano"]}',jsonb_build_object('wallet_address', _wallet_address, 'wallet_name', left(_wallet_name,50)),NOW(),NOW(),'','','','')
    RETURNING id INTO _user_id;
    UPDATE public.profiles SET wallet_address=_wallet_address, wallet_name=left(_wallet_name,50),
      username=COALESCE(left(_nickname,30), username), connected_at=NOW() WHERE id=_user_id;
  END IF;
  -- Existing profiles are never modified here: the caller has not proven wallet ownership.
  RETURN _user_id;
END;
$function$;