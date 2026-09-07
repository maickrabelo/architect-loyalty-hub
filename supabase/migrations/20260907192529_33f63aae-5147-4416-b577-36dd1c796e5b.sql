ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS cliente_telefone text;

ALTER TABLE public.premiacoes
  ADD COLUMN IF NOT EXISTS valor_premio numeric NOT NULL DEFAULT 0;

ALTER TABLE public.configuracoes_financeiras
  ADD COLUMN IF NOT EXISTS dias_atraso_bloqueio integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dia_vencimento_mensalidade integer,
  ADD COLUMN IF NOT EXISTS dia_vencimento_extras integer;

ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS vencimento_mensalidade date,
  ADD COLUMN IF NOT EXISTS vencimento_extras date;

CREATE OR REPLACE FUNCTION public.gerar_faturas_mes(_mes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.configuracoes_financeiras%ROWTYPE;
  ini date;
  fim date;
  venc date;
  venc_mens date;
  venc_extras date;
  base date;
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
  base := (ini + interval '1 month')::date;
  venc := LEAST(base + (cfg.dia_vencimento - 1), (ini + interval '2 month - 1 day')::date);
  venc_mens := LEAST(base + (COALESCE(cfg.dia_vencimento_mensalidade, cfg.dia_vencimento) - 1), (ini + interval '2 month - 1 day')::date);
  venc_extras := LEAST(base + (COALESCE(cfg.dia_vencimento_extras, cfg.dia_vencimento) - 1), (ini + interval '2 month - 1 day')::date);

  FOR e IN SELECT id, nome FROM public.empresas LOOP
    SELECT COALESCE(SUM(FLOOR(v.valor_venda/1000)),0) INTO v_pontos
      FROM public.vendas v WHERE v.empresa_id = e.id AND v.data_venda BETWEEN ini AND fim;

    v_custo := v_pontos * cfg.valor_ponto;
    v_mes_pontos := ROUND(v_custo * cfg.percentual_mensal / 100.0, 2);

    v_extras := 0;
    INSERT INTO public.faturas (empresa_id, mes, pontos, custo_pontos_total, valor_pontos_mes, valor_mensalidade, valor_extras, valor_total, vencimento, vencimento_mensalidade, vencimento_extras)
    VALUES (e.id, _mes, v_pontos, v_custo, v_mes_pontos, cfg.salario_minimo, 0, v_mes_pontos + cfg.salario_minimo, venc, venc_mens, venc_extras)
    ON CONFLICT (empresa_id, mes) DO UPDATE SET
      pontos = EXCLUDED.pontos,
      custo_pontos_total = EXCLUDED.custo_pontos_total,
      valor_pontos_mes = EXCLUDED.valor_pontos_mes,
      valor_mensalidade = EXCLUDED.valor_mensalidade,
      vencimento = EXCLUDED.vencimento,
      vencimento_mensalidade = EXCLUDED.vencimento_mensalidade,
      vencimento_extras = EXCLUDED.vencimento_extras
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
$function$;

CREATE OR REPLACE FUNCTION public.marcar_faturas_vencidas()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD; n integer := 0; dias integer;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT COALESCE(dias_atraso_bloqueio, 0) INTO dias
    FROM public.configuracoes_financeiras ORDER BY created_at LIMIT 1;
  dias := COALESCE(dias, 0);

  UPDATE public.faturas SET status = 'vencida'
   WHERE status = 'aberta' AND vencimento < CURRENT_DATE;

  FOR r IN
    SELECT DISTINCT f.empresa_id FROM public.faturas f
    WHERE f.status IN ('vencida','parcial') AND f.vencimento < (CURRENT_DATE - dias)
  LOOP
    UPDATE public.empresas SET bloqueada = true,
      motivo_bloqueio = 'Bloqueio automático por fatura em atraso há mais de ' || dias || ' dia(s)'
     WHERE id = r.empresa_id AND bloqueada = false;
    IF FOUND THEN
      INSERT INTO public.bloqueios_empresa (empresa_id, acao, justificativa, origem)
      VALUES (r.empresa_id, 'bloqueio', 'Bloqueio automático por fatura em atraso', 'automatico');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('bloqueadas', n);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_rateio_premiacao_empresa(_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.configuracoes_financeiras%ROWTYPE;
  res jsonb;
BEGIN
  IF NOT (public.is_empresa_owner(_empresa_id, auth.uid()) OR public.is_financeiro(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO cfg FROM public.configuracoes_financeiras ORDER BY created_at LIMIT 1;

  WITH pontos AS (
    SELECT v.arquiteto_id,
           SUM(FLOOR(v.valor_venda/1000)) AS pontos_totais,
           SUM(FLOOR(v.valor_venda/1000)) FILTER (WHERE v.empresa_id = _empresa_id) AS pontos_empresa
    FROM public.vendas v
    GROUP BY v.arquiteto_id
  ), base AS (
    SELECT p.arquiteto_id,
           COALESCE(pr.nome_divulgacao, pr.nome) AS nome,
           p.pontos_totais,
           COALESCE(p.pontos_empresa,0) AS pontos_empresa,
           (SELECT pm.nome FROM public.premiacoes pm
             WHERE pm.ativa IS NOT FALSE AND pm.pontos_necessarios <= p.pontos_totais
             ORDER BY pm.pontos_necessarios DESC LIMIT 1) AS premio_nome,
           COALESCE((SELECT pm.pontos_necessarios FROM public.premiacoes pm
             WHERE pm.ativa IS NOT FALSE AND pm.pontos_necessarios <= p.pontos_totais
             ORDER BY pm.pontos_necessarios DESC LIMIT 1),0) AS premio_pontos,
           COALESCE((SELECT pm.valor_premio FROM public.premiacoes pm
             WHERE pm.ativa IS NOT FALSE AND pm.pontos_necessarios <= p.pontos_totais
             ORDER BY pm.pontos_necessarios DESC LIMIT 1),0) AS premio_valor
    FROM pontos p
    JOIN public.profiles pr ON pr.id = p.arquiteto_id
    WHERE COALESCE(p.pontos_empresa,0) > 0
  )
  SELECT jsonb_build_object(
    'valor_ponto', COALESCE(cfg.valor_ponto,0),
    'percentual_mensal', COALESCE(cfg.percentual_mensal,0),
    'linhas', COALESCE(jsonb_agg(jsonb_build_object(
        'arquiteto_id', b.arquiteto_id,
        'nome', b.nome,
        'pontos_totais', b.pontos_totais,
        'pontos_empresa', b.pontos_empresa,
        'percentual', ROUND(b.pontos_empresa::numeric * 100 / NULLIF(b.pontos_totais,0), 2),
        'premio_nome', b.premio_nome,
        'premio_pontos', b.premio_pontos,
        'premio_valor', b.premio_valor,
        'pontos_excedentes', b.pontos_totais - b.premio_pontos,
        'custo_proporcional', ROUND(b.premio_valor * b.pontos_empresa / NULLIF(b.pontos_totais,0), 2),
        'ja_adiantado', ROUND(b.pontos_empresa * COALESCE(cfg.valor_ponto,0) * COALESCE(cfg.percentual_mensal,0) / 100.0, 2),
        'saldo_final', GREATEST(
            ROUND(b.premio_valor * b.pontos_empresa / NULLIF(b.pontos_totais,0), 2)
            - ROUND(b.pontos_empresa * COALESCE(cfg.valor_ponto,0) * COALESCE(cfg.percentual_mensal,0) / 100.0, 2), 0)
      ) ORDER BY b.pontos_empresa DESC), '[]'::jsonb)
  ) INTO res
  FROM base b;

  RETURN res;
END;
$function$;