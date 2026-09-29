CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SEQUENCE IF NOT EXISTS public.boleto_seq START 1;

CREATE TABLE public.boletos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  tipo text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  numero text UNIQUE,
  linha_digitavel text,
  codigo_barras text,
  qr_code text,
  url_imagem text,
  status text NOT NULL DEFAULT 'pendente',
  codigo_estado integer,
  valor_pago numeric NOT NULL DEFAULT 0,
  pago_em date,
  erro text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX boletos_fatura_tipo_ativo ON public.boletos(fatura_id, tipo) WHERE status IN ('pendente','emitido','pago');

GRANT SELECT ON public.boletos TO authenticated;
GRANT ALL ON public.boletos TO service_role;
GRANT USAGE ON SEQUENCE public.boleto_seq TO service_role;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro ve boletos" ON public.boletos FOR SELECT TO authenticated USING (public.is_financeiro(auth.uid()));
CREATE POLICY "Empresa ve seus boletos" ON public.boletos FOR SELECT TO authenticated USING (public.is_empresa_owner(empresa_id, auth.uid()));
CREATE TRIGGER trg_boletos_updated BEFORE UPDATE ON public.boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.proximo_numero_boleto() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT nextval('public.boleto_seq') $$;
REVOKE ALL ON FUNCTION public.proximo_numero_boleto() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_numero_boleto() TO service_role;

-- token interno (cron + webhook), sem acesso pela API pública
CREATE TABLE public.integracao_tokens (nome text PRIMARY KEY, token text NOT NULL);
GRANT ALL ON public.integracao_tokens TO service_role;
ALTER TABLE public.integracao_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.integracao_tokens VALUES ('bb', encode(gen_random_bytes(24),'hex')) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_bb_webhook_token() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN (SELECT token FROM public.integracao_tokens WHERE nome='bb');
END $$;

-- baixa de pagamento de boleto (chamada pelo servidor)
CREATE OR REPLACE FUNCTION public.registrar_pagamento_boleto(_boleto_id uuid, _valor numeric, _data date, _codigo_estado integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.boletos%ROWTYPE; f public.faturas%ROWTYPE; novo numeric; st text;
BEGIN
  SELECT * INTO b FROM public.boletos WHERE id = _boleto_id FOR UPDATE;
  IF NOT FOUND OR b.status = 'pago' THEN RETURN; END IF;
  UPDATE public.boletos SET status='pago', valor_pago=_valor, pago_em=_data, codigo_estado=_codigo_estado WHERE id=b.id;
  SELECT * INTO f FROM public.faturas WHERE id=b.fatura_id FOR UPDATE;
  novo := f.valor_pago + _valor;
  st := CASE WHEN novo >= f.valor_total THEN 'paga' WHEN novo > 0 THEN 'parcial' ELSE f.status END;
  UPDATE public.faturas SET valor_pago=novo, status=st, pago_em=CASE WHEN st='paga' THEN _data ELSE pago_em END WHERE id=f.id;
  INSERT INTO public.movimentacoes_financeiras (data, mes, tipo, categoria, descricao, valor, empresa_id, fatura_id)
  VALUES (COALESCE(_data, CURRENT_DATE), f.mes, 'recebimento', 'boleto', 'Boleto BB ('||b.tipo||') nº '||b.numero, _valor, f.empresa_id, f.id);
  IF st='paga' AND NOT EXISTS (SELECT 1 FROM public.faturas WHERE empresa_id=f.empresa_id AND status IN ('vencida','parcial')) THEN
    UPDATE public.empresas SET bloqueada=false, motivo_bloqueio=NULL WHERE id=f.empresa_id AND bloqueada;
    IF FOUND THEN
      INSERT INTO public.bloqueios_empresa (empresa_id, acao, justificativa, origem)
      VALUES (f.empresa_id,'liberacao','Liberação automática após pagamento de boleto','automatico');
    END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.registrar_pagamento_boleto(uuid,numeric,date,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pagamento_boleto(uuid,numeric,date,integer) TO service_role;

SELECT cron.schedule('bb-sincronizar-boletos', '0 8,13,19 * * *', $$
  SELECT net.http_post(
    url := 'https://kdjatuxlryulapclqnud.supabase.co/functions/v1/bb-boletos',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.integracao_tokens WHERE nome='bb')),
    body := '{"action":"sincronizar"}'::jsonb);
$$);