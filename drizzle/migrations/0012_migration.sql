-- Ranking geral de profissionais (grupo inteiro) para gestor, lojistas e profissionais
CREATE OR REPLACE FUNCTION public.get_ranking_geral()
RETURNS TABLE(id uuid, nome text, vendas numeric, pontos numeric, empresas bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.nome_divulgacao, p.nome) AS nome,
    COALESCE(SUM(v.valor_venda), 0)::numeric AS vendas,
    COALESCE(SUM(v.pontos_calculados), 0)::numeric AS pontos,
    COUNT(DISTINCT v.empresa_id) AS empresas
  FROM public.profiles p
  LEFT JOIN public.vendas v ON v.arquiteto_id = p.id
  WHERE public.has_role(p.id, 'arquiteto'::app_role)
  GROUP BY p.id, p.nome, p.nome_divulgacao
  ORDER BY vendas DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ranking_geral() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_ranking_geral() IS 'Ranking geral de profissionais do grupo (vendas, pontos e quantidade de lojistas) para uso em paineis de gestor, lojista e profissional';