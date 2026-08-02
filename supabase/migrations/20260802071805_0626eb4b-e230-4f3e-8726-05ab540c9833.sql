DROP VIEW IF EXISTS public.csb_leaderboard;

CREATE VIEW public.csb_leaderboard
WITH (security_invoker = off) AS
WITH nft AS (
  SELECT user_id,
         MAX(COALESCE(csb_tokens, 0))::bigint AS csb_tokens,
         MAX(COALESCE(bulls_owned, 0)) AS bulls_owned
  FROM public.user_nft_bonuses
  GROUP BY user_id
), dia AS (
  SELECT user_id, MAX(COALESCE(balance, 0))::bigint AS balance
  FROM public.user_diamonds
  GROUP BY user_id
)
SELECT p.id AS user_id,
       p.username,
       p.avatar_url,
       COALESCE(n.csb_tokens, 0)::bigint AS csb_tokens,
       COALESCE(n.bulls_owned, 0) AS bulls_owned,
       COALESCE(d.balance, 0)::bigint AS total_diamonds,
       row_number() OVER (
         ORDER BY COALESCE(n.csb_tokens, 0) DESC,
                  COALESCE(n.bulls_owned, 0) DESC,
                  COALESCE(d.balance, 0) DESC
       ) AS rank
FROM public.profiles p
LEFT JOIN nft n ON n.user_id = p.id
LEFT JOIN dia d ON d.user_id = p.id
ORDER BY 4 DESC, 5 DESC, 6 DESC
LIMIT 100;

GRANT SELECT ON public.csb_leaderboard TO anon, authenticated;