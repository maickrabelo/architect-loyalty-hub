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
import { Download, RefreshCw, Loader2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFaturas, formatBRL, labelMes, exportarCSV } from "@/hooks/useFinanceiro";
import { statusBadge } from "./FinanceiroResumo";
import BoletosFatura from "./BoletosFatura";
import { ordenarPorNome } from "@/lib/ordenar";

const dataBR = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");

const FinanceiroFaturas = ({ mes, caixaFechado }: { mes: string; caixaFechado: boolean }) => {
  const { data: faturas = [], isLoading } = useFaturas(mes);
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [pagamento, setPagamento] = useState<any>(null);
  const [boletosDe, setBoletosDe] = useState<any>(null);
  const [valorPago, setValorPago] = useState("");
  const [manual, setManual] = useState<null | { empresa: string; tipo: string; valor: string; vencimento: string; descricao: string }>(null);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-fatura-manual"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, nome").eq("demo", false);
      if (error) throw error;
      return ordenarPorNome(data || [], (e: any) => e.nome);
    },
  });

  const criarManual = useMutation({
    mutationFn: async () => {
      const m = manual!;
      const valor = Number(m.valor.replace(/\./g, "").replace(",", "."));
      const { error } = await supabase.rpc("criar_fatura_manual" as any, {
        _empresa_id: m.empresa, _tipo: m.tipo, _valor: valor, _vencimento: m.vencimento, _descricao: m.descricao,
      });
      if (error) throw error;
      return m.vencimento.slice(0, 7);
    },
    onSuccess: (mesFatura: string) => {
      toast.success(mesFatura === mes ? "Fatura manual criada" : `Fatura criada em ${labelMes(mesFatura)} (mês do vencimento)`);
      setManual(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  const filtradas = ordenarPorNome(
    faturas.filter((f: any) =>
      (f.empresas?.nome ?? "").toLowerCase().includes(busca.toLowerCase()),
    ),
    (f: any) => f.empresas?.nome,
  );

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Faturas de {labelMes(mes)}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setManual({ empresa: "", tipo: "mensalidade", valor: "", vencimento: "", descricao: "" })}>
              <Plus className="h-4 w-4 mr-2" /> Fatura manual
            </Button>
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
                    vencimento_mensalidade: f.vencimento_mensalidade ?? f.vencimento,
                    vencimento_pontos: f.vencimento,
                    vencimento_extras: f.vencimento_extras ?? f.vencimento,
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
              <TableHead>Venc. mensalidade</TableHead>
              <TableHead>Venc. pontos (50%)</TableHead>
              <TableHead>Venc. extras</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && filtradas.length === 0 && (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma fatura. Clique em "Gerar / atualizar faturas".</TableCell></TableRow>
            )}
            {filtradas.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  {f.empresas?.nome}
                  {f.manual && (
                    <Badge variant="outline" className="ml-2">
                      Manual · {f.tipo_manual === "pontos" ? "Pontos" : f.tipo_manual === "mensalidade" ? "Mensalidade" : "Outros"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_total))}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_pago))}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(f.valor_total) - Number(f.valor_pago))}</TableCell>
                <TableCell>{dataBR(f.vencimento_mensalidade ?? f.vencimento)}</TableCell>
                <TableCell>{dataBR(f.vencimento)}</TableCell>
                <TableCell>{Number(f.valor_extras) > 0 ? dataBR(f.vencimento_extras ?? f.vencimento) : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={statusBadge(f.status)}>{f.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="secondary" onClick={() => setBoletosDe(f)}>Boletos</Button>
                  <Button size="sm" variant="outline" onClick={() => setBoletosDe(f)}>Editar valores</Button>

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

      <Dialog open={!!manual} onOpenChange={(o) => !o && setManual(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar fatura manual</DialogTitle></DialogHeader>
          {manual && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={manual.empresa} onValueChange={(v) => setManual({ ...manual, empresa: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de fatura</Label>
                <Select value={manual.tipo} onValueChange={(v) => setManual({ ...manual, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pontos">Pontos</SelectItem>
                    <SelectItem value="mensalidade">Mensalidade</SelectItem>
                    <SelectItem value="extras">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input inputMode="decimal" placeholder="0,00" value={manual.valor} onChange={(e) => setManual({ ...manual, valor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="date" value={manual.vencimento} onChange={(e) => setManual({ ...manual, vencimento: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input maxLength={500} value={manual.descricao} onChange={(e) => setManual({ ...manual, descricao: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">A fatura entra no mês do vencimento. Depois, emita o boleto em "Boletos".</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManual(null)}>Cancelar</Button>
            <Button
              disabled={criarManual.isPending || !manual?.empresa || !manual?.vencimento || !(Number(manual?.valor.replace(/\./g, "").replace(",", ".")) > 0)}
              onClick={() => criarManual.mutate()}
            >
              {criarManual.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Gerar fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BoletosFatura fatura={boletosDe} onClose={() => setBoletosDe(null)} />
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
