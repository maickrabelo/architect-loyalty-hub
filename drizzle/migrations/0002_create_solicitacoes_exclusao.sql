CREATE TABLE public.solicitacoes_exclusao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  nome text NOT NULL,
  email text NOT NULL,
  cpf_cnpj text,
  tipo text NOT NULL DEFAULT 'exclusao_total',
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  observacao_interna text,
  processado_em timestamptz,
  processado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.solicitacoes_exclusao TO anon;
GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_exclusao TO authenticated;
GRANT ALL ON public.solicitacoes_exclusao TO service_role;

ALTER TABLE public.solicitacoes_exclusao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode solicitar exclusao"
  ON public.solicitacoes_exclusao FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Usuario ve suas proprias solicitacoes"
  ON public.solicitacoes_exclusao FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gestor ve todas as solicitacoes"
  ON public.solicitacoes_exclusao FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "Gestor atualiza solicitacoes"
  ON public.solicitacoes_exclusao FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER trg_solicitacoes_exclusao_updated
  BEFORE UPDATE ON public.solicitacoes_exclusao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();