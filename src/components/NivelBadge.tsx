import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { destinoAtual } from "@/lib/destinos";
import { cn } from "@/lib/utils";

type LinhaRanking = { id: string; pontos: number | string };

/**
 * Nível (destino conquistado) de cada profissional, calculado a partir dos
 * pontos totais da campanha — soma das vendas em todas as lojas parceiras.
 * A consulta é compartilhada e cacheada entre todas as listas do app.
 */
export const useNiveisProfissionais = () =>
  useQuery({
    queryKey: ["niveis-profissionais"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_ranking_geral");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const linha of (data || []) as LinhaRanking[]) {
        map.set(linha.id, Number(linha.pontos) || 0);
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

export function NivelBadge({
  professionalId,
  className,
}: {
  professionalId: string;
  className?: string;
}) {
  const { data: niveis } = useNiveisProfissionais();
  if (!niveis) return null;

  const pontos = niveis.get(professionalId) ?? 0;
  const nivel = destinoAtual(pontos);

  if (!nivel) {
    return (
      <span
        className={cn("shrink-0 text-[11px] font-medium text-muted-foreground", className)}
        title={`${pontos.toLocaleString("pt-BR")} pontos · ainda não conquistou destino`}
      >
        Sem nível
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary",
        className,
      )}
      title={`${nivel.nome} · ${pontos.toLocaleString("pt-BR")} pontos`}
    >
      <Sparkles className="h-3 w-3" />
      {nivel.nome}
    </span>
  );
}
