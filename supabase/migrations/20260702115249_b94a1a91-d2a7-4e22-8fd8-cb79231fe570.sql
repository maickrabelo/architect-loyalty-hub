CREATE OR REPLACE FUNCTION public.is_empresa_owner(_empresa_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.id = _empresa_id
      AND e.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.arquiteto_tem_venda_com_empresa(_empresa_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendas v
    WHERE v.empresa_id = _empresa_id
      AND v.arquiteto_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Arquitetos podem ver empresas relacionadas" ON public.empresas;
DROP POLICY IF EXISTS "Empresas podem atualizar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Empresas podem deletar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Empresas podem inserir vendas" ON public.vendas;
DROP POLICY IF EXISTS "Empresas podem ver suas vendas" ON public.vendas;

CREATE POLICY "Arquitetos podem ver empresas relacionadas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'arquiteto'::app_role)
  AND public.arquiteto_tem_venda_com_empresa(id, auth.uid())
);

CREATE POLICY "Empresas podem ver suas vendas"
ON public.vendas
FOR SELECT
TO authenticated
USING (public.is_empresa_owner(empresa_id, auth.uid()));

CREATE POLICY "Empresas podem inserir vendas"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (public.is_empresa_owner(empresa_id, auth.uid()));

CREATE POLICY "Empresas podem atualizar suas vendas"
ON public.vendas
FOR UPDATE
TO authenticated
USING (public.is_empresa_owner(empresa_id, auth.uid()))
WITH CHECK (public.is_empresa_owner(empresa_id, auth.uid()));

CREATE POLICY "Empresas podem deletar suas vendas"
ON public.vendas
FOR DELETE
TO authenticated
USING (public.is_empresa_owner(empresa_id, auth.uid()));