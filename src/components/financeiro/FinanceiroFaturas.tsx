import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { useFaturas, formatBRL, labelMes, exportarCSV } from "@/hooks/useFinanceiro";
import { statusBadge } from "./FinanceiroResumo";

const FinanceiroFaturas = ({ mes, caixaFechado }: { mes: string; caixaFechado: boolean }) => {
  const { data: faturas = [], isLoading } = useFaturas(mes);
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [pagamento, setPagamento] = useState<any>(null);
  const [valorPago, setValorPago] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["faturas"] });
    queryClient.invalidateQueries({ queryKey: ["saldo-campanha"] });
    queryClient.invalidateQueries({ queryKey: ["caixa", mes] });
  };

  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("gerar_faturas_mes", { _mes: mes });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Faturas geradas: ${d?.faturas ?? 0}`);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const registrarPagamento = useMutation({
    mutationFn: async ({ fatura, valor }: { fatura: any; valor: number }) => {
      const total = Number(fatura.valor_total);
      const pago = Number(fatura.valor_pago) + valor;
      const status = pago >= total ? "paga" : pago > 0 ? "parcial" : fatura.status;
      const { error } = await supabase
        .from("faturas")
        .update({ valor_pago: pago, status, pago_em: status === "paga" ? new Date().toISOString().slice(0, 10) : null })
        .eq("id", fatura.id);
      if (error) throw error;

      const { error: e2 } = await supabase.from("movimentacoes_financeiras").insert({
        mes,
        tipo: "recebimento",
        categoria: "fatura",
        descricao: `Recebimento fatura ${labelMes(mes)} - ${fatura.empresas?.nome}`,
        valor,
        empresa_id: fatura.empresa_id,
        fatura_id: fatura.id,
      });
      if (e2) throw e2;

      if (status === "paga") {
        const { data: pendentes } = await supabase
          .from("faturas")
          .select("id")
          .eq("empresa_id", fatura.empresa_id)
          .in("status", ["vencida", "parcial"]);
        if (!pendentes || pendentes.length === 0) {
          await supabase.rpc("definir_bloqueio_empresa", {
            _empresa_id: fatura.empresa_id,
            _bloquear: false,
            _justificativa: `Liberação automática após quitação da fatura de ${labelMes(mes)}`,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPagamento(null);
      setValorPago("");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", mes] });
      queryClient.invalidateQueries({ queryKey: ["empresas-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["bloqueios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtradas = faturas.filter((f: any) =>
    (f.empresas?.nome ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Faturas de {labelMes(mes)}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => gerar.mutate()} disabled={gerar.isPending || caixaFechado}>
              {gerar.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Gerar / atualizar faturas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportarCSV(
                  `faturas-${mes}`,
                  filtradas.map((f: any) => ({
                    empresa: f.empresas?.nome,
                    mes: f.mes,
                    total: f.valor_total,
                    pago: f.valor_pago,
                    vencimento: f.vencimento,
                    status: f.status,
                  })),
                )
              }
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </div>
        {caixaFechado && (
          <p className="text-xs text-muted-foreground">Caixa deste mês está fechado — reabra para gerar faturas novamente.</p>
        )}
        <Input placeholder="Buscar empresa..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && filtradas.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma fatura. Clique em "Gerar / atualizar faturas".</TableCell></TableRow>
            )}
            {filtradas.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.empresas?.nome}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_total))}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_pago))}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_total) - Number(f.valor_pago))}</TableCell>
                <TableCell>{new Date(f.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell><Badge variant="outline" className={statusBadge(f.status)}>{f.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={f.status === "paga"}
                    onClick={() => {
                      setPagamento(f);
                      setValorPago(String(Number(f.valor_total) - Number(f.valor_pago)));
                    }}
                  >
                    Registrar pagamento
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!pagamento} onOpenChange={(o) => !o && setPagamento(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento — {pagamento?.empresas?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Saldo devedor: {formatBRL(Number(pagamento?.valor_total ?? 0) - Number(pagamento?.valor_pago ?? 0))}
            </p>
            <div className="space-y-2">
              <Label>Valor recebido</Label>
              <Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamento(null)}>Cancelar</Button>
            <Button
              disabled={registrarPagamento.isPending || !Number(valorPago)}
              onClick={() => registrarPagamento.mutate({ fatura: pagamento, valor: Number(valorPago) })}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FinanceiroFaturas;
