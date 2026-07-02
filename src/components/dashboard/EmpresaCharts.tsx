import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Venda = {
  data_venda: string;
  valor_venda: number | string;
  arquiteto_id: string;
};

type Arquiteto = {
  id: string;
  nome: string;
  vendasTotal: number;
};

interface Props {
  vendas: Venda[];
  arquitetos: Arquiteto[];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CORES = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 30 80% 55%))",
  "hsl(var(--chart-3, 200 70% 50%))",
  "hsl(var(--chart-4, 340 75% 55%))",
  "hsl(var(--chart-5, 160 60% 45%))",
  "hsl(var(--muted-foreground))",
];

const calcularPontos = (v: number) => Math.floor(v / 1000);

export default function EmpresaCharts({ vendas, arquitetos }: Props) {
  // 1) Evolução de vendas (últimos 12 meses)
  const evolucao = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        total: 0,
      });
    }
    vendas.forEach((v) => {
      const d = new Date(v.data_venda);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.find((x) => x.key === key);
      if (b) b.total += Number(v.valor_venda);
    });
    return buckets.map((b) => ({ mes: b.label, total: b.total }));
  }, [vendas]);

  // 2) Média de pontuação por profissional
  const mediaPorProf = useMemo(() => {
    return arquitetos
      .map((a) => {
        const vs = vendas.filter((v) => v.arquiteto_id === a.id);
        const totalPontos = vs.reduce((s, v) => s + calcularPontos(Number(v.valor_venda)), 0);
        const media = vs.length > 0 ? totalPontos / vs.length : 0;
        return { nome: a.nome.split(" ")[0], media: Number(media.toFixed(1)) };
      })
      .filter((x) => x.media > 0)
      .sort((a, b) => b.media - a.media)
      .slice(0, 10);
  }, [vendas, arquitetos]);

  // 3) Pizza – top profissionais por pontuação
  const topProfissionais = useMemo(() => {
    const ranking = arquitetos
      .map((a) => ({ nome: a.nome, pontos: calcularPontos(a.vendasTotal) }))
      .filter((x) => x.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos);
    const top = ranking.slice(0, 5);
    const outros = ranking.slice(5).reduce((s, x) => s + x.pontos, 0);
    if (outros > 0) top.push({ nome: "Outros", pontos: outros });
    return top;
  }, [arquitetos]);

  // 4) Comparativo mês-a-mês entre anos
  const comparativoAnos = useMemo(() => {
    const porAno: Record<number, number[]> = {};
    vendas.forEach((v) => {
      const d = new Date(v.data_venda);
      const y = d.getFullYear();
      if (!porAno[y]) porAno[y] = Array(12).fill(0);
      porAno[y][d.getMonth()] += Number(v.valor_venda);
    });
    const anos = Object.keys(porAno).map(Number).sort();
    return MESES.map((m, i) => {
      const row: any = { mes: m };
      anos.forEach((y) => (row[String(y)] = porAno[y][i]));
      return row;
    });
  }, [vendas]);

  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    vendas.forEach((v) => set.add(new Date(v.data_venda).getFullYear()));
    return Array.from(set).sort();
  }, [vendas]);

  const configEvolucao = { total: { label: "Vendas (R$)", color: "hsl(var(--primary))" } };
  const configMedia = { media: { label: "Média de pontos", color: "hsl(var(--primary))" } };
  const configPizza = Object.fromEntries(
    topProfissionais.map((t, i) => [t.nome, { label: t.nome, color: CORES[i % CORES.length] }])
  );
  const configComparativo = Object.fromEntries(
    anosDisponiveis.map((y, i) => [String(y), { label: String(y), color: CORES[i % CORES.length] }])
  );

  const formatBRL = (n: number) =>
    n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}k` : `R$ ${n.toFixed(0)}`;

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* Evolução */}
      <Card className="bg-card border-border md:col-span-2">
        <CardHeader>
          <CardTitle>Evolução de Vendas</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configEvolucao} className="h-[280px] w-full">
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatBRL} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Média por profissional */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Média de Pontos por Profissional</CardTitle>
          <CardDescription>Média por venda registrada</CardDescription>
        </CardHeader>
        <CardContent>
          {mediaPorProf.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem dados suficientes</p>
          ) : (
            <ChartContainer config={configMedia} className="h-[280px] w-full">
              <BarChart data={mediaPorProf}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Pizza top */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Top Profissionais por Pontuação</CardTitle>
          <CardDescription>Distribuição dos mais pontuados</CardDescription>
        </CardHeader>
        <CardContent>
          {topProfissionais.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem dados suficientes</p>
          ) : (
            <ChartContainer config={configPizza} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="nome" />} />
                <Pie data={topProfissionais} dataKey="pontos" nameKey="nome" outerRadius={90} label={(e: any) => `${e.nome}`}>
                  {topProfissionais.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Comparativo anos */}
      <Card className="bg-card border-border md:col-span-2">
        <CardHeader>
          <CardTitle>Comparativo de Vendas — Ano a Ano</CardTitle>
          <CardDescription>Mesmo mês comparado entre anos diferentes</CardDescription>
        </CardHeader>
        <CardContent>
          {anosDisponiveis.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem dados suficientes</p>
          ) : (
            <ChartContainer config={configComparativo} className="h-[320px] w-full">
              <BarChart data={comparativoAnos}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatBRL} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />} />
                <ChartLegend content={<ChartLegendContent />} />
                {anosDisponiveis.map((y, i) => (
                  <Bar key={y} dataKey={String(y)} fill={CORES[i % CORES.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
