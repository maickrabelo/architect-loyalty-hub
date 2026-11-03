ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aniversariante_nome text;

CREATE TABLE public.aniversarios_pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pessoa text NOT NULL,
  nascimento date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aniversarios_pessoas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aniversarios_pessoas TO authenticated;
GRANT ALL ON public.aniversarios_pessoas TO service_role;
CREATE POLICY "gestor gerencia aniversarios" ON public.aniversarios_pessoas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestor')) WITH CHECK (has_role(auth.uid(),'gestor'));
CREATE POLICY "dono ve aniversarios" ON public.aniversarios_pessoas FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_aniversariantes()
 RETURNS TABLE(id uuid, nome text, profissao text, dia integer, mes integer, celular text, instagram text, imagem_profissional text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT p.id, COALESCE(NULLIF(p.nome_divulgacao,''), p.nome) AS n, NULLIF(p.aniversariante_nome,'') AS pessoa,
           p.profissao, p.nascimento, p.celular, p.instagram, p.imagem_profissional
    FROM profiles p JOIN user_roles r ON r.user_id = p.id AND r.role = 'arquiteto'
    WHERE p.nascimento IS NOT NULL
    UNION ALL
    SELECT p.id, COALESCE(NULLIF(p.nome_divulgacao,''), p.nome), a.pessoa,
           p.profissao, a.nascimento, p.celular, p.instagram, p.imagem_profissional
    FROM aniversarios_pessoas a JOIN profiles p ON p.id = a.profile_id
  )
  SELECT id, CASE WHEN pessoa IS NULL THEN n ELSE n || ' - ' || pessoa END, profissao,
         EXTRACT(DAY FROM nascimento)::int, EXTRACT(MONTH FROM nascimento)::int,
         celular, instagram, imagem_profissional
  FROM base
  WHERE (auth.role() = 'service_role' OR has_role(auth.uid(),'gestor') OR has_role(auth.uid(),'empresa') OR has_role(auth.uid(),'financeiro') OR has_role(auth.uid(),'auditor'))
  ORDER BY 5, 4, 2
$function$;