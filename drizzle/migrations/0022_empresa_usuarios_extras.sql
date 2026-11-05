CREATE TABLE public.empresa_usuarios (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, user_id)
);
GRANT SELECT ON public.empresa_usuarios TO authenticated;
GRANT ALL ON public.empresa_usuarios TO service_role;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve seus vinculos" ON public.empresa_usuarios FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'gestor'));

CREATE OR REPLACE FUNCTION public.is_empresa_owner(_empresa_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = _empresa_id AND e.user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.empresa_usuarios u WHERE u.empresa_id = _empresa_id AND u.user_id = _user_id);
$$;

CREATE POLICY "Usuarios vinculados veem a empresa" ON public.empresas FOR SELECT TO authenticated USING (public.is_empresa_owner(id, auth.uid()));
CREATE POLICY "Usuarios vinculados atualizam a empresa" ON public.empresas FOR UPDATE TO authenticated USING (public.is_empresa_owner(id, auth.uid()));