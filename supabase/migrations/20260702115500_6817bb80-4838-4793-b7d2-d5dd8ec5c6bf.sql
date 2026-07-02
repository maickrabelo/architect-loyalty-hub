DROP VIEW IF EXISTS public.profissionais_publicos;

CREATE OR REPLACE FUNCTION public.get_profissionais_publicos()
RETURNS TABLE(
  id uuid,
  nome text,
  nome_divulgacao text,
  profissao text,
  cidade text,
  estado text,
  imagem_profissional text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.nome,
    p.nome_divulgacao,
    p.profissao,
    p.cidade,
    p.estado,
    p.imagem_profissional
  FROM public.profiles p
  WHERE public.has_role(p.id, 'arquiteto'::app_role)
  ORDER BY COALESCE(p.nome_divulgacao, p.nome);
$$;

REVOKE ALL ON FUNCTION public.get_profissionais_publicos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profissionais_publicos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profissionais_publicos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profissionais_publicos() TO service_role;