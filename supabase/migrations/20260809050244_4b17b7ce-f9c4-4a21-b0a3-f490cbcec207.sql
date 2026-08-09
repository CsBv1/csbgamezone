CREATE OR REPLACE VIEW public.bw_public_characters AS
  SELECT user_id, bull_name, bull_image, level, region
  FROM public.bw_characters;

REVOKE ALL ON public.bw_public_characters FROM anon;
GRANT SELECT ON public.bw_public_characters TO authenticated;
GRANT ALL ON public.bw_public_characters TO service_role;