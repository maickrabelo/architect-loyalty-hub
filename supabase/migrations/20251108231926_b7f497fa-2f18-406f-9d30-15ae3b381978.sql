-- Drop the overly permissive policy for architects
DROP POLICY IF EXISTS "Arquitetos podem ver empresas" ON public.empresas;

-- Create a more restrictive policy that only allows architects to see companies they have sales with
CREATE POLICY "Arquitetos podem ver empresas relacionadas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'arquiteto'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.vendas 
    WHERE vendas.empresa_id = empresas.id 
    AND vendas.arquiteto_id = auth.uid()
  )
);