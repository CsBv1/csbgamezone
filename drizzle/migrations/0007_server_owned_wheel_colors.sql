CREATE OR REPLACE FUNCTION public.spin_color_wheel()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid:=auth.uid(); key_row public.user_keys; prize record; idx integer; already boolean;
BEGIN
 IF caller IS NULL THEN RAISE EXCEPTION 'Sign in to spin' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(caller::text,0));
 SELECT * INTO key_row FROM public.user_keys WHERE user_id=caller AND balance>=1 ORDER BY created_at,id LIMIT 1 FOR UPDATE;
 IF key_row.id IS NULL THEN RAISE EXCEPTION 'You need a Key to spin' USING ERRCODE='22023'; END IF;
 idx:=floor(random()*12)::integer;
 SELECT * INTO prize FROM (VALUES
 (0,'Neon Pink','#FF10F0'),(1,'Electric Blue','#00D4FF'),(2,'Laser Green','#39FF14'),
 (3,'Cyber Purple','#B026FF'),(4,'Golden Glow','#FFD700'),(5,'Toxic Green','#00FF41'),
 (6,'Hot Pink','#FF69B4'),(7,'Ice Blue','#7DF9FF'),(8,'Solar Orange','#FF4500'),
 (9,'Plasma Red','#FF0080'),(10,'Mint Fresh','#00FFB3'),(11,'Royal Purple','#7851A9')
 ) AS catalog(segment,name,value) WHERE segment=idx;
 SELECT EXISTS(SELECT 1 FROM public.user_colors WHERE user_id=caller AND color_name=prize.name) INTO already;
 UPDATE public.user_keys SET balance=balance-1 WHERE id=key_row.id;
 IF NOT already THEN
 INSERT INTO public.user_colors(user_id,color_name,color_value,active) VALUES(caller,prize.name,prize.value,false);
 END IF;
 RETURN jsonb_build_object('index',idx,'name',prize.name,'value',prize.value,'already_owned',already,
 'keys',(SELECT COALESCE(sum(balance),0) FROM public.user_keys WHERE user_id=caller));
END $$;
REVOKE ALL ON FUNCTION public.spin_color_wheel() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spin_color_wheel() TO authenticated;
DROP POLICY IF EXISTS "Users can insert own colors" ON public.user_colors;
REVOKE INSERT,UPDATE ON public.user_colors FROM PUBLIC,anon,authenticated;
GRANT UPDATE(active) ON public.user_colors TO authenticated;
GRANT ALL ON public.user_colors TO service_role;
COMMENT ON FUNCTION public.spin_color_wheel() IS 'Atomic one-Key spin, uniform server-owned color catalog and random outcome. Client can equip only existing colors.';