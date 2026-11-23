CREATE OR REPLACE FUNCTION public.excluir_boleto(_boleto_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b record;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO b FROM public.boletos WHERE id=_boleto_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Boleto não encontrado'; END IF;
  IF b.status='pago' OR COALESCE(b.valor_pago,0) > 0 THEN RAISE EXCEPTION 'Boleto pago não pode ser excluído'; END IF;
  IF b.status='emitido' THEN RAISE EXCEPTION 'Cancele o boleto no banco antes de excluir'; END IF;
  DELETE FROM public.boletos WHERE id=_boleto_id;
END $$;
REVOKE ALL ON FUNCTION public.excluir_boleto(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.excluir_boleto(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.excluir_fatura(_fatura_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f record;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT * INTO f FROM public.faturas WHERE id=_fatura_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;
  IF EXISTS (SELECT 1 FROM public.caixas_mensais WHERE mes=f.mes AND status='fechado') THEN
    RAISE EXCEPTION 'Caixa do mês % já está fechado', f.mes; END IF;
  IF COALESCE(f.valor_pago,0) > 0 OR f.status='pago' THEN
    RAISE EXCEPTION 'Fatura com pagamento registrado não pode ser excluída'; END IF;
  IF EXISTS (SELECT 1 FROM public.boletos WHERE fatura_id=_fatura_id AND status IN ('emitido','pago')) THEN
    RAISE EXCEPTION 'Cancele os boletos desta fatura antes de excluí-la'; END IF;
  UPDATE public.movimentacoes_financeiras SET fatura_id=NULL WHERE fatura_id=_fatura_id;
  DELETE FROM public.boletos WHERE fatura_id=_fatura_id;
  DELETE FROM public.fatura_itens WHERE fatura_id=_fatura_id;
  DELETE FROM public.faturas WHERE id=_fatura_id;
END $$;