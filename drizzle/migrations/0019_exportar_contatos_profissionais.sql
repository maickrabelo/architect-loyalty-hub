CREATE OR REPLACE FUNCTION public.exportar_contatos_profissionais()
RETURNS TABLE (nome text, nome_divulgacao text, profissao text, email text, telefone text, celular text, cep text, endereco text, numero text, complemento text, bairro text, cidade text, estado text, instagram text, facebook text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'gestor'::public.app_role) OR public.has_role(auth.uid(), 'empresa'::public.app_role)) THEN
    RAISE EXCEPTION 'Acesso restrito a gestores e lojistas' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.nome, p.nome_divulgacao, p.profissao, p.email, p.telefone, p.celular, p.cep, p.endereco, p.numero, p.complemento, p.bairro, p.cidade, p.estado, p.instagram, p.facebook
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'arquiteto'::public.app_role)
    ORDER BY lower(p.nome), p.id;
END;
$$;
REVOKE ALL ON FUNCTION public.exportar_contatos_profissionais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exportar_contatos_profissionais() TO authenticated;
COMMENT ON FUNCTION public.exportar_contatos_profissionais() IS 'Exporta apenas contatos e endereços dos profissionais cadastrados para gestores e lojistas; não expõe documentos, senhas ou observações internas.';