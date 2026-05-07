CREATE POLICY "Authenticated read avaliacao-fotos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avaliacao-fotos');

CREATE POLICY "Users upload to own folder avaliacao-fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avaliacao-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avaliacao-fotos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avaliacao-fotos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));