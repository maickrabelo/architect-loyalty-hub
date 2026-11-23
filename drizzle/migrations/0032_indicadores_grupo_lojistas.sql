CREATE FUNCTION public.get_indicadores_grupo_lojista()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE resultado jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'empresa'::public.app_role) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 WITH oficiais AS (
 SELECT v.* FROM public.vendas v JOIN public.empresas e ON e.id=v.empresa_id
 WHERE NOT e.demo AND v.data_venda >= date_trunc('year', CURRENT_DATE)::date AND v.data_venda < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
 ), mensal AS (
 SELECT arquiteto_id, date_trunc('month',data_venda)::date AS data_venda, sum(valor_venda) AS valor_venda, sum(pontos_calculados) AS pontos_calculados, count(*) AS registros FROM oficiais GROUP BY 1,2
 ), ranking AS (
 SELECT p.id, coalesce(p.nome_divulgacao,p.nome) AS nome, sum(v.valor_venda) AS vendas, sum(v.pontos_calculados) AS pontos, count(distinct v.empresa_id) AS empresas
 FROM oficiais v JOIN public.profiles p ON p.id=v.arquiteto_id GROUP BY p.id,p.nome,p.nome_divulgacao
 )
 SELECT jsonb_build_object('vendas',coalesce((SELECT jsonb_agg(m) FROM mensal m),'[]'::jsonb),'ranking',coalesce((SELECT jsonb_agg(r ORDER BY r.pontos DESC,r.vendas DESC,r.nome) FROM ranking r),'[]'::jsonb)) INTO resultado;
 RETURN resultado;
END; $$;
REVOKE ALL ON FUNCTION public.get_indicadores_grupo_lojista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_indicadores_grupo_lojista() TO authenticated, service_role;