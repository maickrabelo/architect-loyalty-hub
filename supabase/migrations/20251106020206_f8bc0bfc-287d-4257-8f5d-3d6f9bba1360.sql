-- Permitir que usuários insiram sua própria role durante cadastro
CREATE POLICY "Usuários podem criar sua própria role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários atualizem seu próprio perfil durante cadastro
CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);