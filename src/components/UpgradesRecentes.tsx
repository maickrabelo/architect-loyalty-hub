import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, TrendingUp } from "lucide-react";
import { usePaginacao, PaginacaoControles } from "@/components/Paginacao";

export type Upgrade = {
  arquiteto_id: string;
  nome: string;
  imagem_profissional: string | null;
  data_upgrade: string;
  de_nivel: string;
  para_nivel: string;
  pontos_no_upgrade: number;
};

export const useUltimosUpgrades = (empresaId?: string) =>
  useQuery({
    queryKey: ["ultimos-upgrades", empresaId || "todos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_ultimos_upgrades", {
        _empresa_id: empresaId || null,
      });
      if (error) throw error;
      const upgrades = (data || []) as Upgrade[];
      return Promise.all(
        upgrades.map(async (u) => {
          if (!u.imagem_profissional || /^https?:\/\//.test(u.imagem_profissional)) return u;
          const { data: signed } = await supabase.storage
            .from("fotos-profissionais")
            .createSignedUrl(u.imagem_profissional, 3600);
          return { ...u, imagem_profissional: signed?.signedUrl || null };
        }),
      );
    },
    staleTime: 10 * 60 * 1000,
  });

const LinhaUpgrade = ({ u }: { u: Upgrade }) => (
  <div className="flex items-center justify-between gap-3 py-3 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-11 w-11 border border-border">
        <AvatarImage src={u.imagem_profissional || undefined} alt={u.nome} className="object-cover" />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-medium truncate">{u.nome}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span>{u.de_nivel}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="font-semibold text-primary">{u.para_nivel}</span>
        </div>
      </div>
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-medium">
        {new Date(u.data_upgrade + "T12:00:00").toLocaleDateString("pt-BR")}
      </p>
      <p className="text-xs text-muted-foreground">
        {Number(u.pontos_no_upgrade).toLocaleString("pt-BR")} pts
      </p>
    </div>
  </div>
);

export const UpgradesRecentes = () => {
  const { data = [], isLoading } = useUltimosUpgrades();
  const { pagina, setPagina, totalPaginas, paginados } = usePaginacao(data, 5);
  if (isLoading) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5 text-primary" /> Últimos Upgrades
            </CardTitle>
            <CardDescription>
              Profissionais que subiram de nível nos últimos 60 dias
            </CardDescription>
          </div>
          <Badge variant="outline">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum upgrade de nível nos últimos 60 dias.
          </p>
        ) : (
          <div>
            {paginados.map((u, i) => (
              <LinhaUpgrade key={`${u.arquiteto_id}-${u.data_upgrade}-${i}`} u={u} />
            ))}
            <PaginacaoControles
              pagina={pagina}
              totalPaginas={totalPaginas}
              onChange={setPagina}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
