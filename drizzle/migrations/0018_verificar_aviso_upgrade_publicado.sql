DO $$
BEGIN
 PERFORM net.http_post(
  url:='https://kdjatuxlryulapclqnud.supabase.co/functions/v1/email-upgrades',
  headers:=jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.integracao_tokens WHERE nome='bb')),
  body:='{"dry_run":true}'::jsonb,
  timeout_milliseconds:=60000
 );
END;
$$;