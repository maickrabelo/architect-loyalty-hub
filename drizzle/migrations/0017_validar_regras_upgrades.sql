DO $$
DECLARE resultado jsonb;
BEGIN
 resultado := public.test_upgrade_email_rules();
 IF resultado->>'passed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Upgrade email tests failed'; END IF;
 RAISE NOTICE 'Upgrade tests passed: %',resultado;
END;
$$;