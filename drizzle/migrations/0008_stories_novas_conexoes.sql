ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url text;

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  media_path text NOT NULL,
  media_tipo text NOT NULL DEFAULT 'imagem',
  duracao_segundos integer NOT NULL DEFAULT 5,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories ver" ON public.stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "stories inserir" ON public.stories FOR INSERT TO authenticated WITH CHECK (
  (empresa_id IS NULL AND public.has_role(auth.uid(),'gestor'))
  OR (empresa_id IS NOT NULL AND (public.is_empresa_owner(empresa_id, auth.uid()) OR public.has_role(auth.uid(),'gestor')))
);
CREATE POLICY "stories remover" ON public.stories FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'gestor') OR (empresa_id IS NOT NULL AND public.is_empresa_owner(empresa_id, auth.uid()))
);

CREATE OR REPLACE FUNCTION public.validar_limite_stories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.duracao_segundos < 2 OR NEW.duracao_segundos > 60 THEN
    RAISE EXCEPTION 'Duração deve ser entre 2 e 60 segundos';
  END IF;
  IF NEW.fim IS NOT NULL AND NEW.fim <= NEW.inicio THEN
    RAISE EXCEPTION 'Data de fim deve ser posterior ao início';
  END IF;
  IF NEW.empresa_id IS NOT NULL AND (
    SELECT count(*) FROM public.stories s
    WHERE s.empresa_id = NEW.empresa_id AND (s.fim IS NULL OR s.fim > now())
  ) >= 3 THEN
    RAISE EXCEPTION 'Cada empresa pode ter no máximo 3 stories ativos ou programados';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_stories_limite BEFORE INSERT ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.validar_limite_stories();

CREATE TABLE public.story_visualizacoes (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  visto_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.story_visualizacoes TO authenticated;
GRANT ALL ON public.story_visualizacoes TO service_role;
ALTER TABLE public.story_visualizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views proprias ver" ON public.story_visualizacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "views proprias inserir" ON public.story_visualizacoes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "views proprias atualizar" ON public.story_visualizacoes FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "stories bucket ler" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'stories');
CREATE POLICY "stories bucket enviar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'stories' AND (
    public.has_role(auth.uid(),'gestor') OR
    CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_empresa_owner(((storage.foldername(name))[1])::uuid, auth.uid()) ELSE false END
  )
);
CREATE POLICY "stories bucket atualizar" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'stories' AND (
    public.has_role(auth.uid(),'gestor') OR
    CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_empresa_owner(((storage.foldername(name))[1])::uuid, auth.uid()) ELSE false END
  )
);
CREATE POLICY "stories bucket remover" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'stories' AND (
    public.has_role(auth.uid(),'gestor') OR
    CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_empresa_owner(((storage.foldername(name))[1])::uuid, auth.uid()) ELSE false END
  )
);