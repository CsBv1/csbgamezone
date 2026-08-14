DELETE FROM public.bw_boss_damage d
USING public.bw_world_bosses b
WHERE d.boss_id = b.id
  AND (b.max_hp > 20000 OR b.boss_key NOT IN ('ember-bull-v2','golden-bull-v2','ocean-kraken-v2','mountain-titan-v2','shadow-bull-v2','crypto-dragon-v2'));

DELETE FROM public.bw_world_bosses b
WHERE b.max_hp > 20000
   OR b.boss_key NOT IN ('ember-bull-v2','golden-bull-v2','ocean-kraken-v2','mountain-titan-v2','shadow-bull-v2','crypto-dragon-v2');