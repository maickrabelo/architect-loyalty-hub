import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { useFaturas, formatBRL, labelMes, exportarCSV } from "@/hooks/useFinanceiro";

export const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paga: "bg-emerald-600/15 text-emerald-700 border-emerald-600/30",
    aberta: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    parcial: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    vencida: "bg-destructive/15 text-destructive border-destructive/30",
    cancelada: "bg-muted text-muted-foreground",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
};

const FinanceiroResumo = ({ mes }: { mes: string }) => {
  const { data: todas = [] } = useFaturas();
  const doMes = useMemo(() => todas.filter((f: any) => f.mes === mes), [todas, mes]);

  const kpis = useMemo(() => {
    const faturado = doMes.reduce((s: number, f: any) => s + Number(f.valor_total), 0);
    const recebido = doMes.reduce((s: number, f: any) => s + Number(f.valor_pago), 0);
    const pontos = doMes.reduce((s: number, f: any) => s + Number(f.pontos), 0);
    const inadimplencia = doMes
      .filter((f: any) => f.status !== "paga")
      .reduce((s: number, f: any) => s + (Number(f.valor_total) - Number(f.valor_pago)), 0);
    return { faturado, recebido, pontos, inadimplencia, emAberto: faturado - recebido };
  }, [doMes]);

  const porMes = useMemo(() => {
    const acc: Record<string, { mes: string; faturado: number; recebido: number; pontos: number }> = {};
    todas.forEach((f: any) => {
      acc[f.mes] ??= { mes: f.mes, faturado: 0, recebido: 0, pontos: 0 };
      acc[f.mes].faturado += Number(f.valor_total);
      acc[f.mes].recebido += Number(f.valor_pago);
      acc[f.mes].pontos += Number(f.pontos);
    });
    return Object.values(acc).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [todas]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Faturado no mês", valor: formatBRL(kpis.faturado) },
          { label: "Recebido", valor: formatBRL(kpis.recebido) },
          { label: "Em aberto", valor: formatBRL(kpis.emAberto) },
          { label: "Inadimplência", valor: formatBRL(kpis.inadimplencia) },
          { label: "Pontos do mês", valor: kpis.pontos.toLocaleString("pt-BR") },
        ].map((k) => (
          <Card key={k.label} className="bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento x Recebimento</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes.map((m) => ({ ...m, label: labelMes(m.mes) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend />
                <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--primary))" />
                <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pontos distribuídos por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porMes.map((m) => ({ ...m, label: labelMes(m.mes) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="pontos" name="Pontos" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Resumo por empresa — {labelMes(mes)}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarCSV(
                `resumo-${mes}`,
                doMes.map((f: any) => ({
                  empresa: f.empresas?.nome,
                  pontos: f.pontos,
                  custo_total_pontos: f.custo_pontos_total,
                  cobrado_no_mes: f.valor_pontos_mes,
                  mensalidade: f.valor_mensalidade,
                  extras: f.valor_extras,
                  total: f.valor_total,
                  status: f.status,
                })),
              )
            }
          >
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Custo pontos</TableHead>
                <TableHead className="text-right">Cobrado no mês</TableHead>
                <TableHead className="text-right">Mensalidade</TableHead>
                <TableHead className="text-right">Extras</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doMes.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma fatura gerada para este mês.</TableCell></TableRow>
              )}
              {doMes.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.empresas?.nome}</TableCell>
                  <TableCell className="text-right">{Number(f.pontos).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.custo_pontos_total))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_pontos_mes))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_mensalidade))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_extras))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(Number(f.valor_total))}</TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(f.status)}>{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroResumo;
