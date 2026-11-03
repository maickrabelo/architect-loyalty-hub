ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS demo boolean NOT NULL DEFAULT false;
UPDATE public.empresas SET demo=true WHERE email='lojateste@localhost.com';

DO $mig$
DECLARE
  x text := '(SELECT d.id FROM public.empresas d WHERE d.demo)';
  d text;
  f text;
  pairs text[][];
  i int;
BEGIN
  pairs := ARRAY[
    ['enfileirar_upgrade_email', 'WHERE v.arquiteto_id=_arquiteto_id;', 'WHERE v.arquiteto_id=_arquiteto_id AND v.empresa_id NOT IN '||x||';'],
    ['enfileirar_upgrade_email', 'WHERE e.ativa AND', 'WHERE e.ativa AND NOT e.demo AND'],
    ['gerar_faturas_mes', 'SELECT id, nome FROM public.empresas LOOP', 'SELECT id, nome FROM public.empresas WHERE NOT demo LOOP'],
    ['get_admin_overview', E'FROM vendas v\n    ),', E'FROM vendas v WHERE v.empresa_id NOT IN '||x||E'\n    ),'],
    ['get_admin_overview', '(SELECT COUNT(*) FROM empresas)', '(SELECT COUNT(*) FROM empresas WHERE NOT demo)'],
    ['get_admin_overview', '(SELECT COUNT(DISTINCT arquiteto_id) FROM vendas)', '(SELECT COUNT(DISTINCT arquiteto_id) FROM vendas WHERE empresa_id NOT IN '||x||')'],
    ['get_admin_overview', 'FROM vendas GROUP BY 1', 'FROM vendas WHERE empresa_id NOT IN '||x||' GROUP BY 1'],
    ['get_admin_overview', E'JOIN empresas e ON e.id = v.empresa_id\n', E'JOIN empresas e ON e.id = v.empresa_id WHERE NOT e.demo\n'],
    ['get_admin_overview', E'LEFT JOIN vendas v ON v.empresa_id = e.id\n', E'LEFT JOIN vendas v ON v.empresa_id = e.id WHERE NOT e.demo\n'],
    ['get_admin_overview', E'LEFT JOIN vendas v ON v.arquiteto_id = p.id\n', E'LEFT JOIN vendas v ON v.arquiteto_id = p.id AND v.empresa_id NOT IN '||x||E'\n'],
    ['get_ranking_arquitetos', 'LEFT JOIN public.profiles p ON p.id = v.arquiteto_id', E'LEFT JOIN public.profiles p ON p.id = v.arquiteto_id\n  WHERE v.empresa_id NOT IN '||x],
    ['get_ranking_geral', 'LEFT JOIN public.vendas v ON v.arquiteto_id = p.id', 'LEFT JOIN public.vendas v ON v.arquiteto_id = p.id AND v.empresa_id NOT IN '||x],
    ['get_rateio_premiacao_empresa', E'FROM public.vendas v\n    GROUP BY', E'FROM public.vendas v\n    WHERE v.empresa_id NOT IN '||x||E' OR v.empresa_id = _empresa_id\n    GROUP BY'],
    ['get_ultimos_upgrades', E'from vendas v\n', E'from vendas v where v.empresa_id not in '||x||E'\n']
  ];
  FOR i IN 1..array_length(pairs,1) LOOP
    f := pairs[i][1];
    SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p WHERE p.proname=f AND p.pronamespace='public'::regnamespace;
    IF position(pairs[i][2] IN d) = 0 THEN RAISE EXCEPTION 'trecho nao encontrado em %: %', f, pairs[i][2]; END IF;
    EXECUTE replace(d, pairs[i][2], pairs[i][3]);
  END LOOP;
END $mig$;