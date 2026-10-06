CREATE OR REPLACE FUNCTION public.get_ultimos_upgrades(_empresa_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(arquiteto_id uuid, nome text, imagem_profissional text, data_upgrade date, de_nivel text, para_nivel text, pontos_no_upgrade numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with vendas_ord as (
    select
      v.arquiteto_id,
      v.data_venda,
      v.created_at,
      v.id,
      sum(v.pontos_calculados) over (
        partition by v.arquiteto_id
        order by v.data_venda, v.created_at, v.id
      ) as acum
    from vendas v
  ),
  niveis as (
    select
      vo.arquiteto_id,
      vo.data_venda,
      vo.acum,
      p.nome as nivel,
      lag(p.nome) over (
        partition by vo.arquiteto_id
        order by vo.data_venda, vo.created_at, vo.id
      ) as nivel_anterior
    from vendas_ord vo
    left join lateral (
      select pr.nome, pr.pontos_necessarios
      from premiacoes pr
      where pr.ativa and pr.pontos_necessarios <= vo.acum
      order by pr.pontos_necessarios desc
      limit 1
    ) p on true
  )
  select
    n.arquiteto_id,
    coalesce(pr.nome_divulgacao, pr.nome) as nome,
    pr.imagem_profissional,
    n.data_venda as data_upgrade,
    coalesce(n.nivel_anterior, 'Iniciante') as de_nivel,
    n.nivel as para_nivel,
    n.acum as pontos_no_upgrade
  from niveis n
  join profiles pr on pr.id = n.arquiteto_id
  where n.nivel is not null
    and (n.nivel_anterior is null or n.nivel_anterior <> n.nivel)
    and n.data_venda >= current_date - 60
    and (
      public.has_role(auth.uid(), 'gestor')
      or public.has_role(auth.uid(), 'financeiro')
      or public.has_role(auth.uid(), 'auditor')
      or public.has_role(auth.uid(), 'empresa')
    )
  order by n.data_venda desc, nome;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ultimos_upgrades(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ultimos_upgrades(uuid) TO service_role;