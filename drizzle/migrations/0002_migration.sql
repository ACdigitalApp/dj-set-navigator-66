DROP POLICY "Admins delete playlist_tracks" ON public.playlist_tracks;
DROP POLICY "Admins delete crate_tracks" ON public.crate_tracks;
CREATE POLICY "Signed-in users delete playlist_tracks" ON public.playlist_tracks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Signed-in users delete crate_tracks" ON public.crate_tracks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);