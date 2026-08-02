ALTER TABLE public.user_nft_bonuses ADD COLUMN IF NOT EXISTS csb_tokens bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE VIEW public.csb_leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(n.csb_tokens, 0::bigint) AS csb_tokens,
  COALESCE(n.bulls_owned, 0) AS bulls_owned,
  COALESCE(d.balance, 0::bigint) AS total_diamonds,
  row_number() OVER (ORDER BY COALESCE(n.csb_tokens, 0::bigint) DESC, COALESCE(n.bulls_owned, 0) DESC, COALESCE(d.balance, 0::bigint) DESC) AS rank
FROM public.profiles p
LEFT JOIN public.user_nft_bonuses n ON n.user_id = p.id
LEFT JOIN public.user_diamonds d ON d.user_id = p.id
ORDER BY COALESCE(n.csb_tokens, 0::bigint) DESC, COALESCE(n.bulls_owned, 0) DESC, COALESCE(d.balance, 0::bigint) DESC
LIMIT 100;

GRANT SELECT ON public.csb_leaderboard TO anon, authenticated;