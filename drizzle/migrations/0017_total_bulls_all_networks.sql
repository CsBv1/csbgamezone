CREATE OR REPLACE FUNCTION public.csb_total_bulls(_uid uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT max(bulls_owned + other_chain_bulls) FROM public.user_nft_bonuses WHERE user_id=_uid),0)
       + COALESCE((SELECT bulls FROM public.user_subscription_bulls WHERE user_id=_uid
                   AND (subscription_end IS NULL OR subscription_end > now())),0)
$function$;