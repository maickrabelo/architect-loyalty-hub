CREATE TABLE public.upgrade_email_estado (
 arquiteto_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 maior_limite integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.upgrade_email_estado TO service_role;
ALTER TABLE public.upgrade_email_estado ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.upgrade_email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 arquiteto_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 limite integer NOT NULL, email text NOT NULL, nome text NOT NULL,
 de_nivel text NOT NULL, para_nivel text NOT NULL, pontos numeric NOT NULL,
 data_upgrade date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 enviado_em timestamptz, tentativas integer NOT NULL DEFAULT 0,
 proxima_tentativa timestamptz NOT NULL DEFAULT now(), bloqueado_ate timestamptz, ultimo_erro text,
 UNIQUE(arquiteto_id,limite,email)
);
GRANT ALL ON public.upgrade_email_outbox TO service_role;
ALTER TABLE public.upgrade_email_outbox ENABLE ROW LEVEL SECURITY;
CREATE INDEX upgrade_email_pendentes ON public.upgrade_email_outbox(proxima_tentativa) WHERE enviado_em IS NULL;
CREATE FUNCTION public.upgrade_email_nivel(_pontos numeric)
RETURNS TABLE(nome text,limite integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.nome,p.pontos_necessarios FROM public.premiacoes p WHERE p.ativa AND p.pontos_necessarios<=_pontos ORDER BY p.pontos_necessarios DESC,p.id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.upgrade_email_nivel(numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_email_nivel(numeric) TO service_role;
INSERT INTO public.upgrade_email_estado(arquiteto_id,maior_limite)
SELECT pr.id,coalesce(n.limite,0) FROM public.profiles pr
LEFT JOIN (SELECT arquiteto_id,max(acum) AS pontos FROM (
 SELECT v.arquiteto_id,sum(v.pontos_calculados) OVER(PARTITION BY v.arquiteto_id ORDER BY v.data_venda,v.created_at,v.id) AS acum FROM public.vendas v
) s GROUP BY arquiteto_id) t ON t.arquiteto_id=pr.id
LEFT JOIN LATERAL public.upgrade_email_nivel(coalesce(t.pontos,0)) n ON true;
CREATE FUNCTION public.enfileirar_upgrade_email(_arquiteto_id uuid,_data date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total numeric; anterior integer; novo integer; nivel text; de_nivel text; profissional text;
BEGIN
 SELECT coalesce(nullif(p.nome_divulgacao,''),p.nome) INTO profissional FROM public.profiles p WHERE p.id=_arquiteto_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT coalesce(sum(v.pontos_calculados),0) INTO total FROM public.vendas v WHERE v.arquiteto_id=_arquiteto_id;
 SELECT n.limite,n.nome INTO novo,nivel FROM public.upgrade_email_nivel(total) n;
 INSERT INTO public.upgrade_email_estado(arquiteto_id,maior_limite) VALUES(_arquiteto_id,0) ON CONFLICT DO NOTHING;
 SELECT maior_limite INTO anterior FROM public.upgrade_email_estado WHERE arquiteto_id=_arquiteto_id FOR UPDATE;
 IF novo IS NULL OR novo<=anterior THEN RETURN; END IF;
 SELECT n.nome INTO de_nivel FROM public.upgrade_email_nivel(anterior) n;
 UPDATE public.upgrade_email_estado SET maior_limite=novo WHERE arquiteto_id=_arquiteto_id;
 INSERT INTO public.upgrade_email_outbox(arquiteto_id,limite,email,nome,de_nivel,para_nivel,pontos,data_upgrade)
 SELECT _arquiteto_id,novo,lower(btrim(e.email)),profissional,coalesce(de_nivel,'Iniciante'),nivel,total,_data FROM public.empresas e
 WHERE e.ativa AND btrim(e.email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 AND lower(btrim(e.email)) NOT LIKE '%@localhost.com' AND lower(btrim(e.email)) NOT LIKE '%@profissional.conexao.com'
 ON CONFLICT(arquiteto_id,limite,email) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.enfileirar_upgrade_email(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enfileirar_upgrade_email(uuid,date) TO service_role;
CREATE FUNCTION public.vendas_upgrade_email_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.arquiteto_id IS DISTINCT FROM OLD.arquiteto_id THEN
  PERFORM p.id FROM public.profiles p WHERE p.id IN(OLD.arquiteto_id,NEW.arquiteto_id) ORDER BY p.id FOR UPDATE;
  PERFORM public.enfileirar_upgrade_email(OLD.arquiteto_id,NEW.data_venda);
 END IF;
 PERFORM public.enfileirar_upgrade_email(NEW.arquiteto_id,NEW.data_venda);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.vendas_upgrade_email_trigger() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vendas_upgrade_email AFTER INSERT OR UPDATE OF pontos_calculados,arquiteto_id ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.vendas_upgrade_email_trigger();
CREATE FUNCTION public.claim_upgrade_emails()
RETURNS SETOF public.upgrade_email_outbox LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.upgrade_email_outbox q SET bloqueado_ate=now()+interval '5 minutes',tentativas=q.tentativas+1
 WHERE q.id IN(SELECT o.id FROM public.upgrade_email_outbox o WHERE o.enviado_em IS NULL AND o.proxima_tentativa<=now() AND(o.bloqueado_ate IS NULL OR o.bloqueado_ate<now()) ORDER BY o.created_at,o.id LIMIT 40 FOR UPDATE SKIP LOCKED) RETURNING q.*
$$;
REVOKE ALL ON FUNCTION public.claim_upgrade_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_upgrade_emails() TO service_role;
CREATE FUNCTION public.wake_upgrade_emails()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.upgrade_email_outbox WHERE enviado_em IS NULL AND proxima_tentativa<=now() AND(bloqueado_ate IS NULL OR bloqueado_ate<now())) THEN
  PERFORM net.http_post(url:='https://kdjatuxlryulapclqnud.supabase.co/functions/v1/email-upgrades',headers:=jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.integracao_tokens WHERE nome='bb')),body:='{}'::jsonb,timeout_milliseconds:=60000);
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.wake_upgrade_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wake_upgrade_emails() TO service_role;
CREATE FUNCTION public.upgrade_email_wake_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.wake_upgrade_emails(); RETURN NULL; END;
$$;
REVOKE ALL ON FUNCTION public.upgrade_email_wake_trigger() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER upgrade_email_wake AFTER INSERT ON public.upgrade_email_outbox FOR EACH STATEMENT EXECUTE FUNCTION public.upgrade_email_wake_trigger();
SELECT cron.schedule('email-upgrades-reconciliacao','0 * * * *','SELECT public.wake_upgrade_emails()');