ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS botao_texto text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS botao_link text;

CREATE TABLE public.banners_profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imagem_desktop_path text NOT NULL,
  imagem_mobile_path text NOT NULL,
  link text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners_profissionais TO authenticated;
GRANT ALL ON public.banners_profissionais TO service_role;
ALTER TABLE public.banners_profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners profissionais ver" ON public.banners_profissionais FOR SELECT TO authenticated USING (true);
CREATE POLICY "banners profissionais inserir" ON public.banners_profissionais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gestor') AND created_by = auth.uid());
CREATE POLICY "banners profissionais atualizar" ON public.banners_profissionais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestor')) WITH CHECK (public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "banners profissionais remover" ON public.banners_profissionais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "banners bucket ler" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'banners-profissionais');
CREATE POLICY "banners bucket enviar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners-profissionais' AND public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "banners bucket atualizar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners-profissionais' AND public.has_role(auth.uid(), 'gestor')) WITH CHECK (bucket_id = 'banners-profissionais' AND public.has_role(auth.uid(), 'gestor'));
CREATE POLICY "banners bucket remover" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners-profissionais' AND public.has_role(auth.uid(), 'gestor'));

CREATE OR REPLACE FUNCTION public.validar_links_conteudo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'stories' THEN
    IF (NEW.botao_texto IS NULL) <> (NEW.botao_link IS NULL) THEN
      RAISE EXCEPTION 'Informe o nome e o link do botão juntos';
    END IF;
    IF NEW.botao_link IS NOT NULL AND NEW.botao_link !~* '^https?://' THEN
      RAISE EXCEPTION 'O link do botão deve começar com http:// ou https://';
    END IF;
    IF NEW.botao_texto IS NOT NULL AND (char_length(btrim(NEW.botao_texto)) < 1 OR char_length(NEW.botao_texto) > 40) THEN
      RAISE EXCEPTION 'O nome do botão deve ter até 40 caracteres';
    END IF;
  ELSIF TG_TABLE_NAME = 'banners_profissionais' THEN
    IF NEW.link IS NOT NULL AND NEW.link !~* '^https?://' THEN
      RAISE EXCEPTION 'O link do banner deve começar com http:// ou https://';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validar_links_stories BEFORE INSERT OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.validar_links_conteudo();
CREATE TRIGGER trg_validar_links_banners BEFORE INSERT OR UPDATE ON public.banners_profissionais FOR EACH ROW EXECUTE FUNCTION public.validar_links_conteudo();