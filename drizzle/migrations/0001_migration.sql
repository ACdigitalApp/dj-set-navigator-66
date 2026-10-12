DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['tracks','playlists','playlist_tracks','crates','crate_tracks','settings','recommendations','sources','user_feedback'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY "Signed-in users read %s" ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', t, t);
    EXECUTE format('CREATE POLICY "Signed-in users insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)', t, t);
    EXECUTE format('CREATE POLICY "Signed-in users update %s" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t, t);
    EXECUTE format('CREATE POLICY "Admins delete %s" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t, t);
  END LOOP;
END $$;

DROP POLICY "Public delete track-artwork" ON storage.objects;
DROP POLICY "Public delete track-audio" ON storage.objects;
DROP POLICY "Public upload track-artwork" ON storage.objects;
DROP POLICY "Public upload track-audio" ON storage.objects;
CREATE POLICY "Signed-in upload track files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('track-artwork','track-audio') AND auth.uid() IS NOT NULL);
CREATE POLICY "Owners or admins delete track files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('track-artwork','track-audio') AND (owner_id = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));