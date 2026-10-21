CREATE FUNCTION public.test_upgrade_email_rules()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE profissional uuid; loja uuid; venda uuid; quantidade integer; esperado integer; resultado jsonb;
BEGIN
 SELECT p.id INTO profissional FROM public.profiles p WHERE NOT EXISTS(SELECT 1 FROM public.vendas v WHERE v.arquiteto_id=p.id) LIMIT 1;
 SELECT id INTO loja FROM public.empresas WHERE ativa LIMIT 1;
 SELECT count(DISTINCT lower(btrim(email))) INTO esperado FROM public.empresas WHERE ativa AND btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND lower(btrim(email)) NOT LIKE '%@localhost.com' AND lower(btrim(email)) NOT LIKE '%@profissional.conexao.com';
 IF profissional IS NULL OR loja IS NULL OR esperado<>16 THEN RAISE EXCEPTION 'Test prerequisites not met'; END IF;
 BEGIN
  UPDATE public.upgrade_email_estado SET maior_limite=0 WHERE arquiteto_id=profissional;
  INSERT INTO public.vendas(empresa_id,arquiteto_id,valor_venda,pontos_calculados,data_venda) VALUES(loja,profissional,399000,399,current_date) RETURNING id INTO venda;
  SELECT count(*) INTO quantidade FROM public.upgrade_email_outbox WHERE arquiteto_id=profissional;
  IF quantidade<>0 THEN RAISE EXCEPTION '399 points must not trigger an upgrade'; END IF;
  UPDATE public.vendas SET pontos_calculados=400 WHERE id=venda;
  SELECT count(*) INTO quantidade FROM public.upgrade_email_outbox WHERE arquiteto_id=profissional AND limite=400 AND de_nivel='Iniciante' AND para_nivel='Club Med Lake Paradise';
  IF quantidade<>16 THEN RAISE EXCEPTION '400 points must notify all 16 shopkeepers'; END IF;
  UPDATE public.vendas SET pontos_calculados=401 WHERE id=venda;
  SELECT count(*) INTO quantidade FROM public.upgrade_email_outbox WHERE arquiteto_id=profissional;
  IF quantidade<>16 THEN RAISE EXCEPTION 'No duplicate notification within the same level'; END IF;
  UPDATE public.vendas SET pontos_calculados=399 WHERE id=venda;
  UPDATE public.vendas SET pontos_calculados=400 WHERE id=venda;
  SELECT count(*) INTO quantidade FROM public.upgrade_email_outbox WHERE arquiteto_id=profissional;
  IF quantidade<>16 THEN RAISE EXCEPTION 'Restored points must not resend achieved levels'; END IF;
  UPDATE public.vendas SET pontos_calculados=550 WHERE id=venda;
  SELECT count(*) INTO quantidade FROM public.upgrade_email_outbox WHERE arquiteto_id=profissional AND limite=550 AND de_nivel='Club Med Lake Paradise' AND para_nivel='Buenos Aires';
  IF quantidade<>16 THEN RAISE EXCEPTION '550 points must notify all shopkeepers of Buenos Aires'; END IF;
  resultado:=jsonb_build_object('passed',true,'recipients_per_upgrade',16,'rules',5,'rolled_back',true);
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback test fixtures';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.test_upgrade_email_rules() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.test_upgrade_email_rules() TO service_role;