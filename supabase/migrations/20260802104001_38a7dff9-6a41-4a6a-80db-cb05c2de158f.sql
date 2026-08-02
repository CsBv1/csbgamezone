CREATE OR REPLACE VIEW public.csb_challengers
WITH (security_invoker = true)
AS
WITH src AS (
  SELECT np.user_id, max(np.level) AS top_level, count(*)::bigint AS bulls_owned
  FROM public.csbv1_nft_power np
  WHERE np.nft_id LIKE 'csb\_%'
  GROUP BY np.user_id
  UNION ALL
  SELECT nb.user_id, 1 AS top_level, nb.bulls_owned::bigint
  FROM public.user_nft_bonuses nb
  WHERE nb.bulls_owned > 0
)
SELECT s.user_id,
       COALESCE(p.username, 'Bull Holder') AS username,
       max(s.top_level) AS top_level,
       max(s.bulls_owned) AS bulls_owned
FROM src s
LEFT JOIN public.profiles p ON p.id = s.user_id
GROUP BY s.user_id, p.username;

GRANT SELECT ON public.csb_challengers TO authenticated;