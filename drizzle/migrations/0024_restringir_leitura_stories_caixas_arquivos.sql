DROP POLICY IF EXISTS "Autenticados leem caixas" ON public.caixas_mensais;
CREATE POLICY "Equipe e lojas leem caixas" ON public.caixas_mensais FOR SELECT TO authenticated
USING (public.is_financeiro(auth.uid()) OR public.has_role(auth.uid(),'auditor') OR public.has_role(auth.uid(),'empresa'));

DROP POLICY IF EXISTS "stories ver" ON public.stories;
CREATE POLICY "stories ver" ON public.stories FOR SELECT TO authenticated
USING (
  (inicio <= now() AND (fim IS NULL OR fim > now()))
  OR public.has_role(auth.uid(),'gestor')
  OR (empresa_id IS NOT NULL AND public.is_empresa_owner(empresa_id, auth.uid()))
);

DROP POLICY IF EXISTS "stories bucket ler" ON storage.objects;
CREATE POLICY "stories bucket ler" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stories' AND (
  public.has_role(auth.uid(),'gestor')
  OR owner_id = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.media_path = storage.objects.name)
));

DROP POLICY IF EXISTS "banners bucket ler" ON storage.objects;
CREATE POLICY "banners bucket ler" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banners-profissionais' AND (
  public.has_role(auth.uid(),'gestor')
  OR EXISTS (SELECT 1 FROM public.banners_profissionais b WHERE b.ativo AND (b.imagem_desktop_path = storage.objects.name OR b.imagem_mobile_path = storage.objects.name))
));

DROP POLICY IF EXISTS "Authenticated users can view professional profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can view professional profile photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fotos-profissionais' AND (
  owner_id = (select auth.uid()::text)
  OR (storage.foldername(name))[1] = (select auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.imagem_profissional = storage.objects.name AND public.has_role(p.id,'arquiteto'))
));