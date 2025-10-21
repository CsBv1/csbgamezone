-- Add wallet support to existing schema
-- Add wallet_address to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);

-- Drop and recreate leaderboard view with wallet support
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard AS
SELECT 
  COALESCE(p.username, 'Player_' || substr(p.id::text, 1, 8)) as username,
  p.wallet_address,
  p.wallet_name,
  p.avatar_url,
  ud.total_earned as total_diamonds,
  COUNT(gr.id) FILTER (WHERE gr.result = 'win') as total_wins,
  COUNT(gr.id) as total_games,
  RANK() OVER (ORDER BY ud.total_earned DESC) as rank
FROM public.profiles p
LEFT JOIN public.user_diamonds ud ON p.id = ud.user_id
LEFT JOIN public.game_results gr ON p.id = gr.user_id
GROUP BY p.id, p.username, p.wallet_address, p.wallet_name, p.avatar_url, ud.total_earned
ORDER BY total_diamonds DESC
LIMIT 100;

-- Function to handle wallet-based authentication
CREATE OR REPLACE FUNCTION public.handle_wallet_auth(
  _wallet_address TEXT,
  _wallet_name TEXT,
  _nickname TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update profiles policies for public access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);