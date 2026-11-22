CREATE TABLE public.campanhas_historicas (
 ano integer PRIMARY KEY CHECK (ano BETWEEN 2000 AND 2100),
 fonte text NOT NULL,
 resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campanhas_historicas TO authenticated;
GRANT ALL ON public.campanhas_historicas TO service_role;
ALTER TABLE public.campanhas_historicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY historico_consulta_equipe ON public.campanhas_historicas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'auditor'));
CREATE TABLE public.campanha_historico_mensal (
 ano integer NOT NULL REFERENCES public.campanhas_historicas(ano),
 mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
 valor_vendido numeric(16,2) NOT NULL CHECK (valor_vendido >= 0),
 PRIMARY KEY (ano, mes)
);
GRANT SELECT ON public.campanha_historico_mensal TO authenticated;
GRANT ALL ON public.campanha_historico_mensal TO service_role;
ALTER TABLE public.campanha_historico_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY historico_mensal_consulta_equipe ON public.campanha_historico_mensal FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'auditor'));
COMMENT ON TABLE public.campanhas_historicas IS 'Historical report-only snapshots. Never included in operational sales, points, invoices, achievements or email queues.';
COMMENT ON TABLE public.campanha_historico_mensal IS 'Monthly historical totals by independent annual campaign. No inferred points or individual sales.';