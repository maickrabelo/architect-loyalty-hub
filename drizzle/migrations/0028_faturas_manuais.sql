ALTER TABLE public.faturas ADD COLUMN manual boolean NOT NULL DEFAULT false;
ALTER TABLE public.faturas ADD COLUMN tipo_manual text CHECK (tipo_manual IN ('pontos','mensalidade','extras'));
ALTER TABLE public.faturas DROP CONSTRAINT faturas_empresa_id_mes_key;
CREATE UNIQUE INDEX faturas_empresa_mes_auto_key ON public.faturas (empresa_id, mes) WHERE NOT manual;

DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.gerar_faturas_mes'::regproc);
  d := replace(d, 'ON CONFLICT (empresa_id, mes) DO UPDATE', 'ON CONFLICT (empresa_id, mes) WHERE NOT manual DO UPDATE');
  d := replace(d, 'FROM public.empresas WHERE NOT demo LOOP', 'FROM public.empresas WHERE NOT demo LOOP' );
  EXECUTE d;
END $$;

CREATE OR REPLACE FUNCTION public.criar_fatura_manual(_empresa_id uuid, _tipo text, _valor numeric, _vencimento date, _descricao text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mes text; v_id uuid; v_desc text;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _tipo NOT IN ('pontos','mensalidade','extras') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Informe um valor maior que zero'; END IF;
  IF _vencimento IS NULL THEN RAISE EXCEPTION 'Informe o vencimento'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE id=_empresa_id) THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  v_mes := to_char(_vencimento, 'YYYY-MM');
  IF EXISTS (SELECT 1 FROM public.caixas_mensais WHERE mes=v_mes AND status='fechado') THEN
    RAISE EXCEPTION 'Caixa do mês % já está fechado', v_mes;
  END IF;
  v_desc := COALESCE(NULLIF(trim(_descricao),''),
    CASE _tipo WHEN 'pontos' THEN 'Pontos (fatura manual)' WHEN 'mensalidade' THEN 'Mensalidade (fatura manual)' ELSE 'Outros (fatura manual)' END);
  INSERT INTO public.faturas (empresa_id, mes, pontos, custo_pontos_total, valor_pontos_mes, valor_mensalidade, valor_extras, valor_total,
    vencimento, vencimento_mensalidade, vencimento_extras, manual, tipo_manual, observacao)
  VALUES (_empresa_id, v_mes, 0, 0,
    CASE WHEN _tipo='pontos' THEN round(_valor,2) ELSE 0 END,
    CASE WHEN _tipo='mensalidade' THEN round(_valor,2) ELSE 0 END,
    CASE WHEN _tipo='extras' THEN round(_valor,2) ELSE 0 END,
    round(_valor,2), _vencimento, _vencimento, _vencimento, true, _tipo, left(v_desc,500))
  RETURNING id INTO v_id;
  INSERT INTO public.fatura_itens (fatura_id, tipo, descricao, valor)
  VALUES (v_id, CASE WHEN _tipo='extras' THEN 'extra' ELSE _tipo END, left(v_desc,500), round(_valor,2));
  INSERT INTO public.caixas_mensais (mes) VALUES (v_mes) ON CONFLICT (mes) DO NOTHING;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.criar_fatura_manual(uuid,text,numeric,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_fatura_manual(uuid,text,numeric,date,text) TO authenticated;