import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, Loader2 } from "lucide-react";
import { deliverFile } from "@/lib/download";
import { agruparVendasCampanha, compararCampanhas, comparativoCsv, MESES_CAMPANHA, totalComparavel } from "@/lib/campanhasComparativo";
import { toast } from "sonner";

interface ResumoHistorico {
  profissionais_pontuados?: number;
  profissionais_cadastrados?: number;
  taxa_conversao?: number;
  total_abc_informado?: number;
  abc?: { faixa: string; quantidade: number; vendas: number; percentual: number }[];
  observacoes?: string[];
  profissionais?: [number, string, number, number, number, number, number, number][];
}
const brl = (v: number | null) => v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percentual = (v: number | null) => v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export default function ComparativoCampanhas({ permitirPdf = false }: { permitirPdf?: boolean }) {
  const [base, setBase] = useState("2024");
  const [comparada, setComparada] = useState("2025");
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["comparativo-campanhas", anoAtual, agora.getMonth()],
    queryFn: async () => {
      const [campanhas, mensal] = await Promise.all([
        supabase.from("campanhas_historicas").select("ano,fonte,resumo").order("ano"),
        supabase.from("campanha_historico_mensal").select("ano,mes,valor_vendido").order("ano").order("mes"),
      ]);
      if (campanhas.error) throw campanhas.error;
      if (mensal.error) throw mensal.error;
      const atuais: { data_venda: string; valor_venda: number; demo: boolean }[] = [];
      // Historical imports never enter this query; only real operational sales in the current year.
      for (let inicio = 0; ; inicio += 1000) {
        const result = await supabase.from("vendas").select("id,data_venda,valor_venda,empresas!inner(demo)").gte("data_venda", `${anoAtual}-01-01`).lt("data_venda", `${anoAtual + 1}-01-01`).eq("empresas.demo", false).order("id").range(inicio, inicio + 999);
        if (result.error) throw result.error;
        atuais.push(...(result.data ?? []).map(v => ({ data_venda: v.data_venda, valor_venda: Number(v.valor_venda), demo: v.empresas.demo })));
        if ((result.data?.length ?? 0) < 1000) break;
      }
      const historicos = campanhas.data ?? [];
      const meses = (mensal.data ?? []).map(m => ({ ...m, valor_vendido: Number(m.valor_vendido) }));
      if (!historicos.some(c => c.ano === anoAtual)) meses.push(...agruparVendasCampanha(atuais, anoAtual, agora.getMonth() + 1));
      return { campanhas: historicos, meses };
    },
  });
  if (isLoading) return <p className="py-8 text-muted-foreground">Carregando campanhas…</p>;
  if (isError) return <div role="alert" className="space-y-3"><p>Não foi possível consultar as campanhas.</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div>;
  if (!data?.campanhas.length) return <p>Nenhuma campanha histórica disponível.</p>;

  const anos = [...new Set([...data.campanhas.map(c => c.ano), anoAtual])].sort();
  const linhas = compararCampanhas(data.meses, Number(base), Number(comparada));
  const total = totalComparavel(linhas);
  const selecionadas = data.campanhas.filter(c => c.ano === Number(base) || c.ano === Number(comparada));
  const grafico = linhas.map(l => ({ nome: MESES_CAMPANHA[l.mes - 1].slice(0, 3), [base]: l.base, [comparada]: l.comparada }));
  const exportar = async () => {
    try {
      await deliverFile(new Blob([comparativoCsv(linhas, Number(base), Number(comparada))], { type: "text/csv;charset=utf-8" }), `comparativo-campanhas-${base}-${comparada}.csv`);
    } catch { toast.error("Não foi possível baixar o comparativo."); }
  };
  const exportarPdf = async () => {
    if (gerandoPdf) return;
    setGerandoPdf(true);
    try {
      const atual = await refetch();
      if (atual.error || !atual.data) throw atual.error ?? new Error("Dados indisponíveis.");
      const { gerarCampanhasPdf } = await import("@/lib/campanhasPdf");
      await gerarCampanhasPdf(atual.data, Number(base), Number(comparada));
    } catch { toast.error("Não foi possível gerar o PDF. Tente novamente."); }
    finally { setGerandoPdf(false); }
  };
  return <div className="space-y-8">
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="font-serif text-2xl">Comparativo de campanhas</h2><p className="text-sm text-muted-foreground">Vendas mensais · campanhas anuais independentes</p></div>
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div className="space-y-1"><label className="text-sm" htmlFor="campanha-base">Campanha base</label><Select disabled={gerandoPdf} value={base} onValueChange={v => { setBase(v); if (v === comparada) setComparada(base); }}><SelectTrigger id="campanha-base" aria-label="Campanha base" className="w-32"><SelectValue /></SelectTrigger><SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm" htmlFor="campanha-comparada">Comparar com</label><Select disabled={gerandoPdf} value={comparada} onValueChange={v => { setComparada(v); if (v === base) setBase(comparada); }}><SelectTrigger id="campanha-comparada" aria-label="Comparar com" className="w-32"><SelectValue /></SelectTrigger><SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
          <Button variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" />Baixar comparativo</Button>
          {permitirPdf && <Button onClick={exportarPdf} disabled={gerandoPdf}>{gerandoPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}{gerandoPdf ? "Gerando PDF…" : "Gerar PDF"}</Button>}
        </div>
      </div>
      <div className="grid gap-4 border-y py-4 sm:grid-cols-3">
        <div><p className="text-sm text-muted-foreground">Campanha {base}</p><p className="text-xl font-semibold">{brl(total.base)}</p></div>
        <div><p className="text-sm text-muted-foreground">Campanha {comparada}</p><p className="text-xl font-semibold">{brl(total.comparada)}</p></div>
        <div><p className="text-sm text-muted-foreground">Variação · {total.meses} meses comparáveis</p><p className="text-xl font-semibold">{percentual(total.variacao)}</p></div>
      </div>
      {(Number(base) === anoAtual || Number(comparada) === anoAtual) && <p className="text-sm text-muted-foreground">{anoAtual}: valores registrados até o mês atual, ainda parcial. Totais comparados somente nos meses disponíveis nos dois anos; vendas de demonstração excluídas.</p>}
      <div className="h-80 w-full" aria-label={`Gráfico de vendas ${base} e ${comparada}`}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={grafico}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" /><YAxis tickFormatter={v => `${Number(v) / 1000000} mi`} width={55} stroke="hsl(var(--muted-foreground))" /><Tooltip formatter={v => brl(Number(v))} /><Legend /><Bar dataKey={base} fill="hsl(var(--primary))" /><Bar dataKey={comparada} fill="hsl(var(--muted-foreground))" /></BarChart></ResponsiveContainer>
      </div>
      <Table><TableHeader><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">{base}</TableHead><TableHead className="text-right">{comparada}</TableHead><TableHead className="text-right">Variação</TableHead></TableRow></TableHeader><TableBody>{linhas.map(l => <TableRow key={l.mes}><TableCell>{MESES_CAMPANHA[l.mes - 1]}</TableCell><TableCell className="text-right whitespace-nowrap">{brl(l.base)}</TableCell><TableCell className="text-right whitespace-nowrap">{brl(l.comparada)}</TableCell><TableCell className="text-right whitespace-nowrap">{percentual(l.variacao)}</TableCell></TableRow>)}<TableRow className="font-semibold"><TableCell>Total comparável</TableCell><TableCell className="text-right whitespace-nowrap">{brl(total.base)}</TableCell><TableCell className="text-right whitespace-nowrap">{brl(total.comparada)}</TableCell><TableCell className="text-right whitespace-nowrap">{percentual(total.variacao)}</TableCell></TableRow></TableBody></Table>
    </section>
    {selecionadas.map(c => {
      const resumo = c.resumo as unknown as ResumoHistorico;
      return <section key={c.ano} className="space-y-4 border-t pt-6">
        <h3 className="font-serif text-2xl">Arquivo da campanha {c.ano}</h3>
        <p className="text-xs text-muted-foreground">Fonte: {c.fonte}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><p>Profissionais pontuados: <strong>{resumo.profissionais_pontuados ?? "—"}</strong></p>{resumo.profissionais_cadastrados && <p>Cadastrados: <strong>{resumo.profissionais_cadastrados}</strong></p>}{resumo.taxa_conversao && <p>Conversão: <strong>{percentual(resumo.taxa_conversao)}</strong></p>}</div>
        <div className="space-y-2 border-l-2 border-primary pl-4 text-sm text-muted-foreground">{resumo.observacoes?.map(o => <p key={o}>{o}</p>)}</div>
        <details><summary className="cursor-pointer font-medium">Curva ABC · {c.ano}</summary><Table><TableHeader><TableRow><TableHead>Faixa</TableHead><TableHead>Quantidade</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead className="text-right">Participação</TableHead></TableRow></TableHeader><TableBody>{resumo.abc?.map(a => <TableRow key={a.faixa}><TableCell>{a.faixa}</TableCell><TableCell>{a.quantidade}</TableCell><TableCell className="text-right whitespace-nowrap">{brl(a.vendas)}</TableCell><TableCell className="text-right">{percentual(a.percentual)}</TableCell></TableRow>)}<TableRow><TableCell>Total informado no PDF</TableCell><TableCell>{resumo.profissionais_pontuados}</TableCell><TableCell className="text-right whitespace-nowrap">{brl(resumo.total_abc_informado ?? null)}</TableCell><TableCell /></TableRow></TableBody></Table></details>
        {resumo.profissionais && <details><summary className="cursor-pointer font-medium">35 profissionais mais atuantes · {c.ano}</summary><Table><TableHeader><TableRow>{["Posição", "Profissional", "Vendas", "Pontos acumulados", "Pontos premiados", "Pontos não premiados", "% individual", "% acumulado"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{resumo.profissionais.map(p => <TableRow key={p[0]}><TableCell>{p[0]}</TableCell><TableCell className="min-w-48">{p[1]}</TableCell><TableCell className="whitespace-nowrap">{brl(p[2])}</TableCell>{p.slice(3, 6).map((v, i) => <TableCell key={i}>{Number(v).toLocaleString("pt-BR")}</TableCell>)}<TableCell>{percentual(p[6])}</TableCell><TableCell>{percentual(p[7])}</TableCell></TableRow>)}</TableBody></Table></details>}
      </section>;
    })}
  </div>;
}