DROP POLICY IF EXISTS "Autenticados leem config" ON public.configuracoes_financeiras;
CREATE POLICY "Equipe e lojas leem config" ON public.configuracoes_financeiras
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'financeiro')
  OR public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'empresa')
);