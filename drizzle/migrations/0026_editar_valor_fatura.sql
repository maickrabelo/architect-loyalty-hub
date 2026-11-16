CREATE OR REPLACE FUNCTION public.editar_valor_fatura(_fatura_id uuid, _tipo text, _valor numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f public.faturas%ROWTYPE; tot numeric; st text;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _tipo NOT IN ('mensalidade','pontos','extras') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF _valor IS NULL OR _valor < 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.boletos WHERE fatura_id=_fatura_id AND tipo=_tipo AND status='pago') THEN
    RAISE EXCEPTION 'O boleto deste item já foi pago e não pode ser alterado';
  END IF;
  SELECT * INTO f FROM public.faturas WHERE id=_fatura_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;
  IF _tipo='mensalidade' THEN f.valor_mensalidade := round(_valor,2);
  ELSIF _tipo='pontos' THEN f.valor_pontos_mes := round(_valor,2);
  ELSE f.valor_extras := round(_valor,2); END IF;
  tot := f.valor_mensalidade + f.valor_pontos_mes + f.valor_extras;
  st := CASE WHEN f.valor_pago >= tot AND tot > 0 THEN 'paga'
             WHEN f.status = 'paga' AND f.valor_pago < tot THEN CASE WHEN f.valor_pago > 0 THEN 'parcial' ELSE 'aberta' END
             ELSE f.status END;
  UPDATE public.faturas SET valor_mensalidade=f.valor_mensalidade, valor_pontos_mes=f.valor_pontos_mes,
    valor_extras=f.valor_extras, valor_total=tot, status=st, updated_at=now() WHERE id=f.id;
END $$;
REVOKE ALL ON FUNCTION public.editar_valor_fatura(uuid,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_valor_fatura(uuid,text,numeric) TO authenticated;