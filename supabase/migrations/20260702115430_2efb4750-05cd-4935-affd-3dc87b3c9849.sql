CREATE OR REPLACE VIEW public.profissionais_publicos AS
SELECT
  p.id,
  p.nome,
  p.nome_divulgacao,
  p.profissao,
  p.cidade,
  p.estado,
  p.imagem_profissional
FROM public.profiles p
WHERE public.has_role(p.id, 'arquiteto'::app_role);

GRANT SELECT ON public.profissionais_publicos TO authenticated;
GRANT ALL ON public.profissionais_publicos TO service_role;