CREATE TABLE public.banners_home (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 titulo text NOT NULL,
 imagem_path text,
 imagem_url text,
 link text,
 ordem integer NOT NULL DEFAULT 0,
 ativo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT banner_home_imagem CHECK (num_nonnulls(imagem_path, imagem_url) = 1),
 CONSTRAINT banner_home_link CHECK (link IS NULL OR link ~* '^https?://')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners_home TO authenticated;
GRANT ALL ON public.banners_home TO service_role;
ALTER TABLE public.banners_home ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores gerenciam banners home" ON public.banners_home FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestores leem imagens home" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'banners-home' AND public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestores enviam imagens home" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners-home' AND public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "Gestores removem imagens home" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners-home' AND public.has_role(auth.uid(), 'gestor'));