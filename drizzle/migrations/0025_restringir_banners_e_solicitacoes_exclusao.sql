DROP POLICY IF EXISTS "banners profissionais ver" ON public.banners_profissionais;
CREATE POLICY "banners profissionais ver" ON public.banners_profissionais FOR SELECT TO authenticated
USING (ativo OR public.has_role(auth.uid(),'gestor'));

DROP POLICY IF EXISTS "Qualquer pessoa pode solicitar exclusao" ON public.solicitacoes_exclusao;
CREATE POLICY "Qualquer pessoa pode solicitar exclusao" ON public.solicitacoes_exclusao FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'pendente'
  AND processado_em IS NULL AND processado_por IS NULL AND observacao_interna IS NULL
  AND tipo IN ('exclusao_total','anonimizacao')
  AND char_length(btrim(nome)) BETWEEN 2 AND 200
  AND char_length(email) <= 255 AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND (cpf_cnpj IS NULL OR char_length(cpf_cnpj) <= 30)
  AND (motivo IS NULL OR char_length(motivo) <= 2000)
);