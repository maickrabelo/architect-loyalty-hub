REVOKE ALL ON FUNCTION public.is_empresa_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_empresa_owner(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_empresa_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_empresa_owner(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.arquiteto_tem_venda_com_empresa(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arquiteto_tem_venda_com_empresa(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.arquiteto_tem_venda_com_empresa(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.arquiteto_tem_venda_com_empresa(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_profissionais_publicos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profissionais_publicos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profissionais_publicos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profissionais_publicos() TO service_role;