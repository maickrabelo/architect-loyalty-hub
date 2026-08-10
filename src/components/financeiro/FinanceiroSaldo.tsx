import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useSaldoCampanha, useConfigFinanceira, formatBRL, exportarCSV } from "@/hooks/useFinanceiro";

const FinanceiroSaldo = () => {
  const { data: saldos = [] } = useSaldoCampanha();
  const { data: cfg } = useConfigFinanceira();

  const total = useMemo(
    () => saldos.reduce((s: number, x: any) => s + (Number(x.valor_acumulado) - Number(x.valor_pago)), 0),
    [saldos],
  );

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Saldo de campanha (50% diferidos)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              A receber no fechamento: <span className="font-semibold text-foreground">{formatBRL(total)}</span>
              {cfg?.vencimento_saldo && ` · vencimento ${new Date(cfg.vencimento_saldo + "T12:00:00").toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportarCSV(
                "saldo-campanha",
                saldos.map((s: any) => ({
                  empresa: s.empresas?.nome,
                  ano: s.ano,
                  acumulado: s.valor_acumulado,
                  pago: s.valor_pago,
                  saldo: Number(s.valor_acumulado) - Number(s.valor_pago),
                })),
              )
            }
          >
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Acumulado</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">A pagar no fim da campanha</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {saldos.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum saldo acumulado ainda.</TableCell></TableRow>
            )}
            {saldos.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.empresas?.nome}</TableCell>
                <TableCell>{s.ano}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(s.valor_acumulado))}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(s.valor_pago))}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatBRL(Number(s.valor_acumulado) - Number(s.valor_pago))}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{s.quitado ? "quitado" : "em aberto"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FinanceiroSaldo;
