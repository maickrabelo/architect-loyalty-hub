-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.is_financeiro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('financeiro'::app_role, 'gestor'::app_role)
  );
$$;

-- ============ empresas: bloqueio ============
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS bloqueada boolean NOT NULL DEFAULT false;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS motivo_bloqueio text;

CREATE OR REPLACE FUNCTION public.empresa_esta_bloqueada(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT bloqueada FROM public.empresas WHERE id = _empresa_id), false);
$$;

DROP POLICY IF EXISTS "Empresas podem inserir vendas" ON public.vendas;
CREATE POLICY "Empresas podem inserir vendas" ON public.vendas
FOR INSERT TO authenticated
WITH CHECK (is_empresa_owner(empresa_id, auth.uid()) AND NOT empresa_esta_bloqueada(empresa_id));

DROP POLICY IF EXISTS "Empresas podem atualizar suas vendas" ON public.vendas;
CREATE POLICY "Empresas podem atualizar suas vendas" ON public.vendas
FOR UPDATE TO authenticated
USING (is_empresa_owner(empresa_id, auth.uid()) AND NOT empresa_esta_bloqueada(empresa_id))
WITH CHECK (is_empresa_owner(empresa_id, auth.uid()) AND NOT empresa_esta_bloqueada(empresa_id));

CREATE POLICY "Financeiro ve todas as empresas" ON public.empresas
FOR SELECT TO authenticated USING (is_financeiro(auth.uid()));

CREATE POLICY "Financeiro atualiza empresas" ON public.empresas
FOR UPDATE TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));

CREATE POLICY "Financeiro ve todas as vendas" ON public.vendas
FOR SELECT TO authenticated USING (is_financeiro(auth.uid()));

-- ============ configuracoes_financeiras ============
CREATE TABLE public.configuracoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salario_minimo numeric NOT NULL DEFAULT 1518,
  valor_ponto numeric NOT NULL DEFAULT 10,
  percentual_mensal numeric NOT NULL DEFAULT 50,
  dia_vencimento integer NOT NULL DEFAULT 10,
  campanha_inicio date NOT NULL DEFAULT date_trunc('year', now())::date,
  campanha_fim date NOT NULL DEFAULT (date_trunc('year', now()) + interval '1 year - 1 day')::date,
  vencimento_saldo date NOT NULL DEFAULT (date_trunc('year', now()) + interval '1 year - 1 day')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_financeiras TO authenticated;
GRANT ALL ON public.configuracoes_financeiras TO service_role;
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem config" ON public.configuracoes_financeiras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Financeiro insere config" ON public.configuracoes_financeiras FOR INSERT TO authenticated WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Financeiro atualiza config" ON public.configuracoes_financeiras FOR UPDATE TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE TRIGGER trg_config_fin_updated BEFORE UPDATE ON public.configuracoes_financeiras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.configuracoes_financeiras DEFAULT VALUES;

-- ============ caixas_mensais ============
CREATE TABLE public.caixas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aberto',
  fechado_em timestamptz,
  fechado_por uuid,
  total_faturado numeric NOT NULL DEFAULT 0,
  total_recebido numeric NOT NULL DEFAULT 0,
  total_pago numeric NOT NULL DEFAULT 0,
  total_inadimplencia numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.caixas_mensais TO authenticated;
GRANT ALL ON public.caixas_mensais TO service_role;
ALTER TABLE public.caixas_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem caixas" ON public.caixas_mensais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Financeiro gerencia caixas ins" ON public.caixas_mensais FOR INSERT TO authenticated WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Financeiro gerencia caixas upd" ON public.caixas_mensais FOR UPDATE TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE TRIGGER trg_caixas_updated BEFORE UPDATE ON public.caixas_mensais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ cobrancas_extras ============
CREATE TABLE public.cobrancas_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor_mensal numeric NOT NULL DEFAULT 0,
  mes_inicial text NOT NULL,
  meses integer NOT NULL DEFAULT 1,
  ativa boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_extras TO authenticated;
GRANT ALL ON public.cobrancas_extras TO service_role;
ALTER TABLE public.cobrancas_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia cobrancas extras" ON public.cobrancas_extras FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE TRIGGER trg_cobextras_updated BEFORE UPDATE ON public.cobrancas_extras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cobrancas_extras_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id uuid NOT NULL REFERENCES public.cobrancas_extras(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor_mensal numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cobranca_id, empresa_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_extras_empresas TO authenticated;
GRANT ALL ON public.cobrancas_extras_empresas TO service_role;
ALTER TABLE public.cobrancas_extras_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia vinculo extras" ON public.cobrancas_extras_empresas FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve seus extras" ON public.cobrancas_extras_empresas FOR SELECT TO authenticated USING (is_empresa_owner(empresa_id, auth.uid()));

-- ============ faturas ============
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes text NOT NULL,
  pontos numeric NOT NULL DEFAULT 0,
  custo_pontos_total numeric NOT NULL DEFAULT 0,
  valor_pontos_mes numeric NOT NULL DEFAULT 0,
  valor_mensalidade numeric NOT NULL DEFAULT 0,
  valor_extras numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  pago_em date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia faturas" ON public.faturas FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve suas faturas" ON public.faturas FOR SELECT TO authenticated USING (is_empresa_owner(empresa_id, auth.uid()));
CREATE TRIGGER trg_faturas_updated BEFORE UPDATE ON public.faturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fatura_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  cobranca_extra_id uuid REFERENCES public.cobrancas_extras(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatura_itens TO authenticated;
GRANT ALL ON public.fatura_itens TO service_role;
ALTER TABLE public.fatura_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia itens" ON public.fatura_itens FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve itens das suas faturas" ON public.fatura_itens FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.faturas f WHERE f.id = fatura_id AND is_empresa_owner(f.empresa_id, auth.uid())));

-- ============ saldo_campanha ============
CREATE TABLE public.saldo_campanha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  valor_acumulado numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  quitado boolean NOT NULL DEFAULT false,
  vencimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saldo_campanha TO authenticated;
GRANT ALL ON public.saldo_campanha TO service_role;
ALTER TABLE public.saldo_campanha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia saldo" ON public.saldo_campanha FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve seu saldo" ON public.saldo_campanha FOR SELECT TO authenticated USING (is_empresa_owner(empresa_id, auth.uid()));
CREATE TRIGGER trg_saldo_updated BEFORE UPDATE ON public.saldo_campanha FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ movimentacoes_financeiras ============
CREATE TABLE public.movimentacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes text NOT NULL,
  tipo text NOT NULL,
  categoria text,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_financeiras TO authenticated;
GRANT ALL ON public.movimentacoes_financeiras TO service_role;
ALTER TABLE public.movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia movimentacoes" ON public.movimentacoes_financeiras FOR ALL TO authenticated USING (is_financeiro(auth.uid())) WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve suas movimentacoes" ON public.movimentacoes_financeiras FOR SELECT TO authenticated USING (empresa_id IS NOT NULL AND is_empresa_owner(empresa_id, auth.uid()));
CREATE TRIGGER trg_mov_updated BEFORE UPDATE ON public.movimentacoes_financeiras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ bloqueios_empresa ============
CREATE TABLE public.bloqueios_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  acao text NOT NULL,
  justificativa text NOT NULL,
  origem text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bloqueios_empresa TO authenticated;
GRANT ALL ON public.bloqueios_empresa TO service_role;
ALTER TABLE public.bloqueios_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro ve bloqueios" ON public.bloqueios_empresa FOR SELECT TO authenticated USING (is_financeiro(auth.uid()));
CREATE POLICY "Financeiro cria bloqueios" ON public.bloqueios_empresa FOR INSERT TO authenticated WITH CHECK (is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve seu historico" ON public.bloqueios_empresa FOR SELECT TO authenticated USING (is_empresa_owner(empresa_id, auth.uid()));

-- ============ funcoes de negocio ============
CREATE OR REPLACE FUNCTION public.gerar_faturas_mes(_mes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.configuracoes_financeiras%ROWTYPE;
  ini date;
  fim date;
  venc date;
  e RECORD;
  ce RECORD;
  v_pontos numeric;
  v_custo numeric;
  v_mes_pontos numeric;
  v_extras numeric;
  v_fatura_id uuid;
  v_valor numeric;
  criadas integer := 0;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF EXISTS (SELECT 1 FROM public.caixas_mensais c WHERE c.mes = _mes AND c.status = 'fechado') THEN
    RAISE EXCEPTION 'Caixa do mês % já está fechado', _mes;
  END IF;

  SELECT * INTO cfg FROM public.configuracoes_financeiras ORDER BY created_at LIMIT 1;
  ini := to_date(_mes || '-01', 'YYYY-MM-DD');
  fim := (ini + interval '1 month - 1 day')::date;
  venc := LEAST((ini + interval '1 month')::date + (cfg.dia_vencimento - 1), (ini + interval '2 month - 1 day')::date);

  FOR e IN SELECT id, nome FROM public.empresas LOOP
    SELECT COALESCE(SUM(FLOOR(v.valor_venda/1000)),0) INTO v_pontos
      FROM public.vendas v WHERE v.empresa_id = e.id AND v.data_venda BETWEEN ini AND fim;

    v_custo := v_pontos * cfg.valor_ponto;
    v_mes_pontos := ROUND(v_custo * cfg.percentual_mensal / 100.0, 2);

    v_extras := 0;
    INSERT INTO public.faturas (empresa_id, mes, pontos, custo_pontos_total, valor_pontos_mes, valor_mensalidade, valor_extras, valor_total, vencimento)
    VALUES (e.id, _mes, v_pontos, v_custo, v_mes_pontos, cfg.salario_minimo, 0, v_mes_pontos + cfg.salario_minimo, venc)
    ON CONFLICT (empresa_id, mes) DO UPDATE SET
      pontos = EXCLUDED.pontos,
      custo_pontos_total = EXCLUDED.custo_pontos_total,
      valor_pontos_mes = EXCLUDED.valor_pontos_mes,
      valor_mensalidade = EXCLUDED.valor_mensalidade,
      vencimento = EXCLUDED.vencimento
    RETURNING id INTO v_fatura_id;

    DELETE FROM public.fatura_itens WHERE fatura_id = v_fatura_id;
    INSERT INTO public.fatura_itens (fatura_id, tipo, descricao, valor)
    VALUES (v_fatura_id, 'mensalidade', 'Mensalidade do programa', cfg.salario_minimo),
           (v_fatura_id, 'pontos', v_pontos || ' pontos x R$ ' || cfg.valor_ponto || ' (' || cfg.percentual_mensal || '% no mês)', v_mes_pontos);

    FOR ce IN
      SELECT c.id, c.descricao, COALESCE(cee.valor_mensal, c.valor_mensal) AS valor
      FROM public.cobrancas_extras c
      JOIN public.cobrancas_extras_empresas cee ON cee.cobranca_id = c.id AND cee.empresa_id = e.id
      WHERE c.ativa = true
        AND _mes >= c.mes_inicial
        AND to_date(_mes || '-01','YYYY-MM-DD') < (to_date(c.mes_inicial || '-01','YYYY-MM-DD') + (c.meses || ' month')::interval)
    LOOP
      v_valor := COALESCE(ce.valor, 0);
      v_extras := v_extras + v_valor;
      INSERT INTO public.fatura_itens (fatura_id, tipo, descricao, valor, cobranca_extra_id)
      VALUES (v_fatura_id, 'extra', ce.descricao, v_valor, ce.id);
    END LOOP;

    UPDATE public.faturas
      SET valor_extras = v_extras,
          valor_total = v_mes_pontos + cfg.salario_minimo + v_extras
      WHERE id = v_fatura_id;

    INSERT INTO public.saldo_campanha (empresa_id, ano, valor_acumulado, vencimento)
    VALUES (e.id, EXTRACT(YEAR FROM ini)::int, v_custo - v_mes_pontos, cfg.vencimento_saldo)
    ON CONFLICT (empresa_id, ano) DO UPDATE SET
      valor_acumulado = (
        SELECT COALESCE(SUM(f.custo_pontos_total - f.valor_pontos_mes),0)
        FROM public.faturas f
        WHERE f.empresa_id = e.id AND LEFT(f.mes,4) = EXTRACT(YEAR FROM ini)::text
      ),
      vencimento = cfg.vencimento_saldo;

    criadas := criadas + 1;
  END LOOP;

  INSERT INTO public.caixas_mensais (mes) VALUES (_mes) ON CONFLICT (mes) DO NOTHING;

  RETURN jsonb_build_object('mes', _mes, 'faturas', criadas);
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_faturas_vencidas()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n integer := 0;
BEGIN
  UPDATE public.faturas SET status = 'vencida'
   WHERE status = 'aberta' AND vencimento < CURRENT_DATE;

  FOR r IN
    SELECT DISTINCT f.empresa_id FROM public.faturas f
    WHERE f.status IN ('vencida','parcial') AND f.vencimento < CURRENT_DATE
  LOOP
    UPDATE public.empresas SET bloqueada = true,
      motivo_bloqueio = 'Bloqueio automático por fatura em atraso'
     WHERE id = r.empresa_id AND bloqueada = false;
    IF FOUND THEN
      INSERT INTO public.bloqueios_empresa (empresa_id, acao, justificativa, origem)
      VALUES (r.empresa_id, 'bloqueio', 'Bloqueio automático por fatura em atraso', 'automatico');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('bloqueadas', n);
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_bloqueio_empresa(_empresa_id uuid, _bloquear boolean, _justificativa text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _justificativa IS NULL OR length(btrim(_justificativa)) < 5 THEN
    RAISE EXCEPTION 'Justificativa obrigatória';
  END IF;
  UPDATE public.empresas
     SET bloqueada = _bloquear,
         motivo_bloqueio = CASE WHEN _bloquear THEN _justificativa ELSE NULL END
   WHERE id = _empresa_id;
  INSERT INTO public.bloqueios_empresa (empresa_id, acao, justificativa, origem, created_by)
  VALUES (_empresa_id, CASE WHEN _bloquear THEN 'bloqueio' ELSE 'liberacao' END, _justificativa, 'manual', auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.fechar_caixa(_mes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fat numeric; v_rec numeric; v_pag numeric; v_inad numeric;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT COALESCE(SUM(valor_total),0), COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status <> 'paga'),0)
    INTO v_fat, v_inad FROM public.faturas WHERE mes = _mes;
  SELECT COALESCE(SUM(valor) FILTER (WHERE tipo='recebimento'),0), COALESCE(SUM(valor) FILTER (WHERE tipo='pagamento'),0)
    INTO v_rec, v_pag FROM public.movimentacoes_financeiras WHERE mes = _mes;

  INSERT INTO public.caixas_mensais (mes, status, fechado_em, fechado_por, total_faturado, total_recebido, total_pago, total_inadimplencia)
  VALUES (_mes, 'fechado', now(), auth.uid(), v_fat, v_rec, v_pag, v_inad)
  ON CONFLICT (mes) DO UPDATE SET status='fechado', fechado_em=now(), fechado_por=auth.uid(),
    total_faturado=v_fat, total_recebido=v_rec, total_pago=v_pag, total_inadimplencia=v_inad;

  RETURN jsonb_build_object('mes', _mes, 'total_faturado', v_fat, 'total_recebido', v_rec, 'total_pago', v_pag, 'inadimplencia', v_inad);
END;
$$;

CREATE OR REPLACE FUNCTION public.reabrir_caixa(_mes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.caixas_mensais SET status='aberto', fechado_em=NULL, fechado_por=NULL WHERE mes=_mes;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_relatorio_financeiro_empresa(_empresa_id uuid, _mes text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT (public.is_empresa_owner(_empresa_id, auth.uid()) OR public.is_financeiro(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.caixas_mensais WHERE mes = _mes AND status = 'fechado') THEN
    RETURN jsonb_build_object('disponivel', false, 'mes', _mes);
  END IF;

  SELECT jsonb_build_object(
    'disponivel', true,
    'mes', _mes,
    'empresa', (
      SELECT to_jsonb(f) - 'observacao' FROM public.faturas f WHERE f.empresa_id = _empresa_id AND f.mes = _mes
    ),
    'itens', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'valor', i.valor)), '[]'::jsonb)
      FROM public.fatura_itens i JOIN public.faturas f ON f.id = i.fatura_id
      WHERE f.empresa_id = _empresa_id AND f.mes = _mes
    ),
    'programa', (
      SELECT jsonb_build_object(
        'total_esperado', COALESCE(SUM(valor_total),0),
        'total_pontos', COALESCE(SUM(pontos),0),
        'empresas', COUNT(*),
        'inadimplencia', COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status <> 'paga'),0)
      ) FROM public.faturas WHERE mes = _mes
    ),
    'saldo_campanha', (
      SELECT COALESCE(valor_acumulado - valor_pago, 0) FROM public.saldo_campanha
      WHERE empresa_id = _empresa_id AND ano = LEFT(_mes,4)::int
    )
  ) INTO res;
  RETURN res;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_faturas_mes(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fechar_caixa(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reabrir_caixa(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.definir_bloqueio_empresa(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.marcar_faturas_vencidas() FROM anon;
REVOKE EXECUTE ON FUNCTION public.marcar_faturas_vencidas() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_relatorio_financeiro_empresa(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_financeiro(uuid) FROM anon;