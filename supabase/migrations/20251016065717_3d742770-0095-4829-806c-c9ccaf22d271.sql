-- Fix handle_wallet_auth function to access pgcrypto extension
CREATE OR REPLACE FUNCTION public.handle_wallet_auth(_wallet_address text, _wallet_name text, _nickname text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _user_id UUID;
BEGIN
  -- Check if profile with this wallet already exists
  SELECT id INTO _user_id
  FROM public.profiles
  WHERE wallet_address = _wallet_address;
  
  IF _user_id IS NULL THEN
    -- Create new auth user for wallet-based auth
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      _wallet_address || '@cardano.wallet',
      crypt('wallet_auth_' || _wallet_address, gen_salt('bf')),
      NOW(),
      NOW(),
      '{"provider":"cardano","providers":["cardano"]}',
      jsonb_build_object('wallet_address', _wallet_address, 'wallet_name', _wallet_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO _user_id;
    
    -- Update profile created by trigger with wallet info
    UPDATE public.profiles
    SET 
      wallet_address = _wallet_address,
      wallet_name = _wallet_name,
      username = COALESCE(_nickname, username),
      connected_at = NOW()
    WHERE id = _user_id;
  ELSE
    -- Update existing profile
    UPDATE public.profiles
    SET 
      wallet_name = _wallet_name,
      username = COALESCE(_nickname, username),
      connected_at = NOW(),
      updated_at = NOW()
    WHERE id = _user_id;
  END IF;
  
  RETURN _user_id;
END;
$function$;