CREATE OR REPLACE FUNCTION public.marcar_faturas_vencidas()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n integer := 0;
BEGIN
  IF NOT public.is_financeiro(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;

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

GRANT EXECUTE ON FUNCTION public.marcar_faturas_vencidas() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.marcar_faturas_vencidas() FROM anon;