CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco text NOT NULL DEFAULT 'Banco do Brasil',
  conta text NOT NULL UNIQUE,
  saldo_conta numeric NOT NULL DEFAULT 0,
  saldo_aplicado numeric NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financeiro gerencia contas" ON public.contas_bancarias FOR ALL TO authenticated
  USING (public.is_financeiro(auth.uid())) WITH CHECK (public.is_financeiro(auth.uid()));
CREATE POLICY "Auditor ve contas" ON public.contas_bancarias FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'auditor'));