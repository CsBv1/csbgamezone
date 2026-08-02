CREATE OR REPLACE VIEW public.csb_challengers AS
SELECT
  np.user_id,
  COALESCE(p.username, 'Bull Holder') AS username,
  MAX(np.level) AS top_level,
  COUNT(*) AS bulls_owned
FROM public.csbv1_nft_power np
LEFT JOIN public.profiles p ON p.id = np.user_id
WHERE np.nft_id LIKE 'csb\_%'
GROUP BY np.user_id, p.username;

GRANT SELECT ON public.csb_challengers TO authenticated;