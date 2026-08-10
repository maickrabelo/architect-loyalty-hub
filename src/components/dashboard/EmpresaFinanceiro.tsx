import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, labelMes, listaMeses } from "@/hooks/useFinanceiro";

const statusCor = (status: string) =>
  ({
    paga: "bg-emerald-600/15 text-emerald-700 border-emerald-600/30",
    aberta: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    parcial: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    vencida: "bg-destructive/15 text-destructive border-destructive/30",
  } as Record<string, string>)[status] ?? "bg-muted text-muted-foreground";

const EmpresaFinanceiro = ({ empresaId }: { empresaId: string }) => {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const meses = listaMeses(24);

  const { data: faturas = [] } = useQuery({
    queryKey: ["empresa-faturas", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("*, fatura_itens(tipo, descricao, valor)")
        .eq("empresa_id", empresaId)
        .order("mes", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: saldo } = useQuery({
    queryKey: ["empresa-saldo", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saldo_campanha")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("ano", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: relatorio } = useQuery({
    queryKey: ["empresa-relatorio", empresaId, mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relatorio_financeiro_empresa", {
        _empresa_id: empresaId,
        _mes: mes,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!empresaId,
  });

  const faturaMes: any = faturas.find((f: any) => f.mes === mes);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Minhas faturas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Mensalidade</TableHead>
                <TableHead className="text-right">Pontos (mês)</TableHead>
                <TableHead className="text-right">Extras</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturas.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma fatura emitida.</TableCell></TableRow>
              )}
              {faturas.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{labelMes(f.mes)}</TableCell>
                  <TableCell className="text-right">{Number(f.pontos).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_mensalidade))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_pontos_mes))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(f.valor_extras))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(Number(f.valor_total))}</TableCell>
                  <TableCell>{new Date(f.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline" className={statusCor(f.status)}>{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {saldo && (
        <Card>
          <CardHeader><CardTitle className="text-base">Saldo da campanha {saldo.ano}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Acumulado (50% diferidos): <strong>{formatBRL(Number(saldo.valor_acumulado))}</strong></p>
            <p>Já pago: {formatBRL(Number(saldo.valor_pago))}</p>
            <p>
              A pagar no fim da campanha:{" "}
              <strong>{formatBRL(Number(saldo.valor_acumulado) - Number(saldo.valor_pago))}</strong>
              {saldo.vencimento && ` · até ${new Date(saldo.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Relatório financeiro do mês</CardTitle>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{meses.map((m) => <SelectItem key={m} value={m}>{labelMes(m)}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!relatorio?.disponivel ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              O relatório de {labelMes(mes)} será liberado após o fechamento do caixa pelo gestor financeiro.
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">Composição da sua fatura</h4>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Item</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(relatorio.itens ?? []).map((i: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{i.descricao}</TableCell>
                        <TableCell className="text-right">{formatBRL(Number(i.valor))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(Number(faturaMes?.valor_total ?? relatorio.empresa?.valor_total ?? 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Total esperado do programa</p>
                  <p className="text-lg font-semibold">{formatBRL(Number(relatorio.programa?.total_esperado ?? 0))}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Pontos distribuídos no programa</p>
                  <p className="text-lg font-semibold">{Number(relatorio.programa?.total_pontos ?? 0).toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Inadimplência do mês</p>
                  <p className="text-lg font-semibold">{formatBRL(Number(relatorio.programa?.inadimplencia ?? 0))}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Os valores do programa são apresentados de forma consolidada; a inadimplência é agregada e não identifica empresas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresaFinanceiro;
