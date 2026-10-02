CREATE OR REPLACE FUNCTION public.get_aniversariantes()
RETURNS TABLE(id uuid, nome text, profissao text, dia int, mes int, celular text, instagram text, imagem_profissional text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, COALESCE(NULLIF(p.nome_divulgacao,''), p.nome), p.profissao,
         EXTRACT(DAY FROM p.nascimento)::int, EXTRACT(MONTH FROM p.nascimento)::int,
         p.celular, p.instagram, p.imagem_profissional
  FROM profiles p
  JOIN user_roles r ON r.user_id = p.id AND r.role = 'arquiteto'
  WHERE p.nascimento IS NOT NULL
    AND (has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'empresa') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'auditor'))
  ORDER BY 5, 4, 2
$$;
REVOKE ALL ON FUNCTION public.get_aniversariantes() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_aniversariantes() TO authenticated;