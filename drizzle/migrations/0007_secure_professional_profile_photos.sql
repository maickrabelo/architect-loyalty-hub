CREATE POLICY "Professionals can upload their own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fotos-profissionais'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'arquiteto'::public.app_role)
);

CREATE POLICY "Professionals can update their own profile photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fotos-profissionais'
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'fotos-profissionais'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Authenticated users can view professional profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'fotos-profissionais');