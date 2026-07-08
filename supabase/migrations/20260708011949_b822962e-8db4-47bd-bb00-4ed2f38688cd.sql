
CREATE TABLE IF NOT EXISTS public.premiacoes_snapshot (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  arquiteto_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendas numeric(12,2) NOT NULL DEFAULT 0,
  pontos numeric(12,2) NOT NULL DEFAULT 0,
  categoria_premio numeric(12,2) NOT NULL DEFAULT 0,
  custo numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, arquiteto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premiacoes_snapshot TO authenticated;
GRANT ALL ON public.premiacoes_snapshot TO service_role;
ALTER TABLE public.premiacoes_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores veem tudo" ON public.premiacoes_snapshot
  FOR SELECT USING (public.has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "Empresa vê o próprio" ON public.premiacoes_snapshot
  FOR SELECT TO authenticated USING (public.is_empresa_owner(empresa_id, auth.uid()));
CREATE POLICY "Arquiteto vê o próprio" ON public.premiacoes_snapshot
  FOR SELECT TO authenticated USING (auth.uid() = arquiteto_id);

-- Gestor precisa ler empresas para o dashboard admin
CREATE POLICY "Gestores veem todas as empresas" ON public.empresas
  FOR SELECT USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- RPC agregada para gestor
CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'gestor'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'kpis', (
      SELECT jsonb_build_object(
        'total_vendas', COALESCE(SUM(v.valor_venda),0),
        'total_pontos', COALESCE(SUM(FLOOR(v.valor_venda/1000)),0),
        'total_vendas_registros', COUNT(v.id),
        'ticket_medio', COALESCE(AVG(v.valor_venda),0),
        'lojistas', (SELECT COUNT(*) FROM empresas),
        'arquitetos', (SELECT COUNT(*) FROM profiles p WHERE has_role(p.id,'arquiteto'::app_role)),
        'arquitetos_pontuados', (SELECT COUNT(DISTINCT arquiteto_id) FROM vendas),
        'custo_total_premios', COALESCE((SELECT SUM(custo) FROM premiacoes_snapshot),0)
      ) FROM vendas v
    ),
    'faturamento_mensal', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('mes', mes, 'valor', valor, 'pontos', pontos) ORDER BY mes), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', data_venda), 'YYYY-MM') AS mes,
               SUM(valor_venda) AS valor,
               SUM(FLOOR(valor_venda/1000)) AS pontos
        FROM vendas GROUP BY 1
      ) t
    ),
    'pontos_por_empresa_mes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT to_char(date_trunc('month', v.data_venda), 'YYYY-MM') AS mes,
               e.nome AS empresa,
               SUM(FLOOR(v.valor_venda/1000)) AS pontos
        FROM vendas v JOIN empresas e ON e.id = v.empresa_id
        GROUP BY 1,2 ORDER BY 1,2
      ) t
    ),
    'ranking_empresas', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT e.id, e.nome,
               COALESCE(SUM(v.valor_venda),0) AS vendas,
               COALESCE(SUM(FLOOR(v.valor_venda/1000)),0) AS pontos,
               COUNT(DISTINCT v.arquiteto_id) AS profissionais,
               COALESCE((SELECT SUM(custo) FROM premiacoes_snapshot ps WHERE ps.empresa_id=e.id),0) AS custo
        FROM empresas e LEFT JOIN vendas v ON v.empresa_id = e.id
        GROUP BY e.id, e.nome ORDER BY vendas DESC
      ) t
    ),
    'ranking_arquitetos', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT p.id, COALESCE(p.nome_divulgacao, p.nome) AS nome,
               COALESCE(SUM(v.valor_venda),0) AS vendas,
               COALESCE(SUM(FLOOR(v.valor_venda/1000)),0) AS pontos,
               COUNT(DISTINCT v.empresa_id) AS empresas
        FROM profiles p
        LEFT JOIN vendas v ON v.arquiteto_id = p.id
        WHERE has_role(p.id, 'arquiteto'::app_role)
        GROUP BY p.id, p.nome, p.nome_divulgacao
        ORDER BY vendas DESC
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
