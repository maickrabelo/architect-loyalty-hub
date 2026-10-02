import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cake } from "lucide-react";

export type Aniversariante = {
  id: string; nome: string; profissao: string | null; dia: number; mes: number;
  celular: string | null; instagram: string | null; imagem_profissional: string | null;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const pad = (n: number) => String(n).padStart(2, "0");

export const useAniversariantes = () =>
  useQuery({
    queryKey: ["aniversariantes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_aniversariantes");
      if (error) throw error;
      return (data || []) as Aniversariante[];
    },
  });

/** Aniversariantes de hoje até os próximos 6 dias, com a data deste ano. */
const daSemana = (lista: Aniversariante[]) => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const out: (Aniversariante & { data: Date })[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje); d.setDate(hoje.getDate() + i);
    lista.filter(a => a.dia === d.getDate() && a.mes === d.getMonth() + 1).forEach(a => out.push({ ...a, data: d }));
  }
  return out;
};

const Linha = ({ a, destaque }: { a: Aniversariante; destaque?: string }) => (
  <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
        {pad(a.dia)}/{pad(a.mes)}
      </div>
      <div className="min-w-0">
        <p className="font-medium truncate">{a.nome}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[a.profissao, a.celular, a.instagram].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
    {destaque && <span className="text-xs font-semibold text-primary shrink-0">{destaque}</span>}
  </div>
);

export const AniversariantesSemana = () => {
  const { data = [], isLoading } = useAniversariantes();
  const semana = useMemo(() => daSemana(data), [data]);
  if (isLoading) return null;
  const hoje = new Date().toDateString();
  return (
    <Card className="mb-8 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl"><Cake className="h-5 w-5 text-primary" /> Aniversariantes da semana</CardTitle>
        <CardDescription>Profissionais que fazem aniversário nos próximos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        {semana.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aniversariante nesta semana.</p>
        ) : (
          semana.map(a => (
            <Linha key={a.id} a={a} destaque={a.data.toDateString() === hoje ? "Hoje! 🎉" : a.data.toLocaleDateString("pt-BR", { weekday: "short" })} />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export const AniversariantesModulo = () => {
  const { data = [], isLoading } = useAniversariantes();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [busca, setBusca] = useState("");
  const lista = data.filter(a =>
    busca ? a.nome.toLowerCase().includes(busca.toLowerCase()) : a.mes === mes);
  return (
    <div className="space-y-6">
      <AniversariantesSemana />
      <Card>
        <CardHeader>
          <CardTitle>Aniversariantes</CardTitle>
          <CardDescription>{data.length} profissionais com data de aniversário cadastrada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Buscar profissional pelo nome..." value={busca} onChange={e => setBusca(e.target.value)} />
          {!busca && (
            <div className="flex flex-wrap gap-2">
              {MESES.map((m, i) => (
                <Button key={m} size="sm" variant={mes === i + 1 ? "default" : "outline"} onClick={() => setMes(i + 1)}>
                  {m.slice(0, 3)} ({data.filter(a => a.mes === i + 1).length})
                </Button>
              ))}
            </div>
          )}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum aniversariante encontrado.</p> :
            <div>{lista.map(a => <Linha key={a.id} a={a} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
};
