import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Download, RefreshCw, Search, Building2, Users, Award, DollarSign, Target, PieChart as PieIcon } from "lucide-react";

type Overview = {
  kpis: {
    total_vendas: number; total_pontos: number; total_vendas_registros: number;
    ticket_medio: number; lojistas: number; arquitetos: number;
    arquitetos_pontuados: number; custo_total_premios: number;
  };
  faturamento_mensal: { mes: string; valor: number; pontos: number }[];
  pontos_por_empresa_mes: { mes: string; empresa: string; pontos: number }[];
  ranking_empresas: { id: string; nome: string; vendas: number; pontos: number; profissionais: number; custo: number }[];
  ranking_arquitetos: { id: string; nome: string; vendas: number; pontos: number; empresas: number }[];
};

const CORES = [
  "hsl(var(--primary))", "#c97b63", "#8b6f47", "#d4a574", "#6b8e7f",
  "#a67c52", "#7d5a3c", "#b8946a", "#5c7b6e", "#9c6b52",
  "#4a6b5c", "#8b7355", "#a68a6d", "#7d6b52", "#5c4a3c", "#3d5c4a",
];

const fmtBRL = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const fmtBRLShort = (n: number) => n >= 1_000_000 ? `R$ ${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `R$ ${(n/1000).toFixed(0)}k` : `R$ ${n.toFixed(0)}`;

export default function AdminOverview() {
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [buscaProf, setBuscaProf] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_admin_overview");
      if (error) throw error;
      return data as Overview;
    },
  });

  const importar = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/importar-dados-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro na importação");
      return json;
    },
    onSuccess: (json) => {
      toast.success(`Importação concluída: ${json.summary.empresas} lojistas, ${json.summary.profissionais} profissionais, ${json.summary.vendas} vendas`);
      // Baixar CSV de credenciais
      const csv = ["tipo,nome,email,senha", ...json.credenciais.map((c: any) => `${c.tipo},"${c.nome.replace(/"/g,'""')}",${c.email},${c.senha}`)].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "credenciais-conexao.csv"; a.click();
      URL.revokeObjectURL(url);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Prepara dados para gráfico de barras empilhadas por empresa/mes
  const stackData = useMemo(() => {
    if (!data) return { rows: [], empresas: [] as string[] };
    const empresas = Array.from(new Set(data.pontos_por_empresa_mes.map(r => r.empresa)));
    const mesesSet = Array.from(new Set(data.pontos_por_empresa_mes.map(r => r.mes))).sort();
    const rows = mesesSet.map(mes => {
      const row: any = { mes };
      empresas.forEach(e => (row[e] = 0));
      data.pontos_por_empresa_mes.filter(r => r.mes === mes).forEach(r => (row[r.empresa] = Number(r.pontos)));
      return row;
    });
    return { rows, empresas };
  }, [data]);

  const pizzaEmpresas = useMemo(() => {
    if (!data) return [];
    return data.ranking_empresas.filter(e => e.pontos > 0).map(e => ({ nome: e.nome, pontos: Number(e.pontos) }));
  }, [data]);

  const topArqs = useMemo(() => {
    if (!data) return [];
    return data.ranking_arquitetos.slice(0, 15).map(a => ({ ...a, pontos: Number(a.pontos), vendas: Number(a.vendas) }));
  }, [data]);

  const empresasFiltradas = useMemo(() => {
    if (!data) return [];
    return data.ranking_empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresa.toLowerCase()));
  }, [data, buscaEmpresa]);

  const arqsFiltrados = useMemo(() => {
    if (!data) return [];
    return data.ranking_arquitetos.filter(a => a.nome.toLowerCase().includes(buscaProf.toLowerCase()));
  }, [data, buscaProf]);

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Carregando visão geral...</div>;
  if (!data) return null;

  const k = data.kpis;
  const conversao = k.arquitetos > 0 ? (Number(k.arquitetos_pontuados) / Number(k.arquitetos)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Ações */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
        <Button variant="premium" onClick={() => importar.mutate()} disabled={importar.isPending}>
          <Download className="mr-2 h-4 w-4" />
          {importar.isPending ? "Importando..." : "Importar dados do Excel"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<DollarSign />} label="Total vendido" value={fmtBRL(Number(k.total_vendas))} />
        <KPI icon={<Award />} label="Pontos distribuídos" value={Number(k.total_pontos).toLocaleString("pt-BR")} />
        <KPI icon={<Building2 />} label="Lojistas" value={String(k.lojistas)} />
        <KPI icon={<Users />} label="Profissionais" value={`${k.arquitetos_pontuados}/${k.arquitetos}`} sub="pontuados / cadastrados" />
        <KPI icon={<Target />} label="Taxa de conversão" value={`${conversao.toFixed(1)}%`} />
        <KPI icon={<PieIcon />} label="Ticket médio" value={fmtBRL(Number(k.ticket_medio))} />
        <KPI icon={<Award />} label="Custo total prêmios" value={fmtBRL(Number(k.custo_total_premios))} />
        <KPI icon={<DollarSign />} label="Vendas registradas" value={Number(k.total_vendas_registros).toLocaleString("pt-BR")} />
      </div>

      {/* Faturamento mensal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Evolução Mensal — Vendas & Pontos</CardTitle>
          <CardDescription>Faturamento e pontos distribuídos mês a mês</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.faturamento_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="l" stroke="hsl(var(--primary))" tickFormatter={fmtBRLShort} fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="#c97b63" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                formatter={(v: any, n: any) => n === "valor" ? fmtBRL(Number(v)) : Number(v).toLocaleString("pt-BR")} />
              <Legend />
              <Line yAxisId="l" type="monotone" dataKey="valor" name="Vendas (R$)" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line yAxisId="r" type="monotone" dataKey="pontos" name="Pontos" stroke="#c97b63" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pontos por empresa mês a mês (empilhado) */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Pontos por Lojista — Mês a Mês</CardTitle>
          <CardDescription>Distribuição empilhada</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={stackData.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {stackData.empresas.map((e, i) => (
                <Bar key={e} dataKey={e} stackId="a" fill={CORES[i % CORES.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pizza empresas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Distribuição de Pontos por Lojista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={pizzaEmpresas} dataKey="pontos" nameKey="nome" outerRadius={120}
                  label={(e: any) => `${e.nome}`}>
                  {pizzaEmpresas.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR") + " pts"} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top arquitetos */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Top 15 Profissionais por Pontos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={topArqs} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="nome" stroke="hsl(var(--muted-foreground))" fontSize={10} width={140} />
                <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR") + " pts"} />
                <Bar dataKey="pontos" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Lojistas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div>
              <CardTitle>Ranking de Lojistas</CardTitle>
              <CardDescription>Clique numa linha para ver o detalhamento</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar lojista..." value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)} className="pl-9 w-64" />
              </div>
              <Button variant="outline" size="sm" onClick={() => exportCSV(empresasFiltradas, "lojistas.csv")}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[440px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lojista</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Profissionais</TableHead>
                  <TableHead className="text-right">Custo Prêmios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasFiltradas.map(e => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setEmpresaSelecionada(e.id)}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-right">{fmtBRL(Number(e.vendas))}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{Number(e.pontos).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{e.profissionais}</TableCell>
                    <TableCell className="text-right">{fmtBRL(Number(e.custo))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Profissionais */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div>
              <CardTitle>Ranking de Profissionais</CardTitle>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar profissional..." value={buscaProf} onChange={e => setBuscaProf(e.target.value)} className="pl-9 w-64" />
              </div>
              <Button variant="outline" size="sm" onClick={() => exportCSV(arqsFiltrados, "profissionais.csv")}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[440px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Lojistas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arqsFiltrados.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell>#{i + 1}</TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-right">{fmtBRL(Number(a.vendas))}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{Number(a.pontos).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{a.empresas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmpresaDetalheDialog empresaId={empresaSelecionada} onClose={() => setEmpresaSelecionada(null)} />
    </div>
  );
}

function KPI({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <span className="[&>svg]:h-4 [&>svg]:w-4 text-primary">{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function EmpresaDetalheDialog({ empresaId, onClose }: { empresaId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["empresa-detalhe", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data: emp } = await supabase.from("empresas").select("*").eq("id", empresaId!).maybeSingle();
      const { data: prems } = await (supabase as any).from("premiacoes_snapshot").select("*").eq("empresa_id", empresaId!);
      const arqIds = ((prems as any[]) || []).map((p) => p.arquiteto_id);
      let profs: any[] = [];
      if (arqIds.length) {
        const { data: p } = await supabase.from("profiles").select("id, nome, nome_divulgacao").in("id", arqIds);
        profs = p || [];
      }
      return { emp, prems: (prems as any[]) || [], profs };
    },
  });

  if (!empresaId) return null;
  const linhas = (data?.prems || []).map((p: any) => {
    const prof = data?.profs.find((x: any) => x.id === p.arquiteto_id);
    return { nome: prof?.nome_divulgacao || prof?.nome || p.arquiteto_id, ...p };
  }).sort((a: any, b: any) => Number(b.vendas) - Number(a.vendas));
  const totalVendas = linhas.reduce((s: number, l: any) => s + Number(l.vendas), 0);
  const totalCusto = linhas.reduce((s: number, l: any) => s + Number(l.custo), 0);

  return (
    <Dialog open={!!empresaId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{data?.emp?.nome || "Lojista"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary rounded p-3">
            <div className="text-xs text-muted-foreground">Vendas totais</div>
            <div className="text-xl font-bold">{fmtBRL(totalVendas)}</div>
          </div>
          <div className="bg-secondary rounded p-3">
            <div className="text-xs text-muted-foreground">Custo total prêmios</div>
            <div className="text-xl font-bold">{fmtBRL(totalCusto)}</div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
              <TableHead className="text-right">Categoria Prêmio</TableHead>
              <TableHead className="text-right">Custo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.nome}</TableCell>
                <TableCell className="text-right">{fmtBRL(Number(l.vendas))}</TableCell>
                <TableCell className="text-right">{Number(l.pontos).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{fmtBRL(Number(l.categoria_premio))}</TableCell>
                <TableCell className="text-right">{fmtBRL(Number(l.custo))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
