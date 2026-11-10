DROP POLICY IF EXISTS "players can damage bosses" ON public.bw_world_bosses;
CREATE POLICY "players can damage live bosses" ON public.bw_world_bosses
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND status = 'alive' AND despawn_at > now())
WITH CHECK (auth.uid() IS NOT NULL AND status IN ('alive','defeated'));