DROP VIEW IF EXISTS public.bw_public_characters;

CREATE POLICY "signed in players can view characters"
ON public.bw_characters
FOR SELECT
TO authenticated
USING (true);