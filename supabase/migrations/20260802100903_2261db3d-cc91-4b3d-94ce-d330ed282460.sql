ALTER VIEW public.csb_challengers SET (security_invoker = on);

CREATE POLICY "Authenticated can view bulls for challenges"
ON public.csbv1_nft_power
FOR SELECT
TO authenticated
USING (true);