-- Create a safe public profile view that excludes sensitive wallet data
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker=on)
AS
SELECT 
  id,
  username,
  avatar_url,
  created_at
FROM public.profiles;

-- Update the RLS policy to only allow full profile access to the owner
DROP POLICY IF EXISTS "Public can view limited profile data" ON public.profiles;

CREATE POLICY "Public can view limited profile data"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own full profile
    auth.uid() = id
    -- OR they can only see username and avatar from others (enforced at application level)
  );